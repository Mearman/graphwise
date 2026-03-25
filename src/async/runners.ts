/**
 * Sync and async runners for generator-based graph algorithms.
 *
 * The runner drives a generator that yields GraphOp objects, resolves each op
 * against the graph, and feeds the result back via gen.next(response). This
 * allows algorithm logic to be written once as a generator and executed
 * synchronously or asynchronously depending on the graph backing.
 *
 * @module async/runners
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../graph";
import type { AsyncReadableGraph } from "../graph/async-interfaces";
import type { GraphOp, GraphOpResponse } from "./protocol";
import type { AsyncRunnerOptions } from "./types";
import { collectAsyncIterable, defaultYieldStrategy } from "./utils";

// ---------------------------------------------------------------------------
// Sync runner
// ---------------------------------------------------------------------------

/**
 * Resolve a single GraphOp against a synchronous ReadableGraph.
 *
 * Returns a tagged GraphOpResponse so the receiving generator can narrow
 * the result type without type assertions.
 *
 * @param graph - The synchronous graph to query
 * @param op - The operation to resolve
 * @returns The tagged response
 */
export function resolveSyncOp<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	op: GraphOp,
): GraphOpResponse<N, E> {
	switch (op.tag) {
		case "neighbours":
			return {
				tag: "neighbours",
				value: Array.from(graph.neighbours(op.id, op.direction)),
			};
		case "degree":
			return { tag: "degree", value: graph.degree(op.id, op.direction) };
		case "getNode":
			return { tag: "getNode", value: graph.getNode(op.id) };
		case "getEdge":
			return { tag: "getEdge", value: graph.getEdge(op.source, op.target) };
		case "hasNode":
			return { tag: "hasNode", value: graph.hasNode(op.id) };
		case "batchNeighbours": {
			const result = new Map<NodeId, readonly NodeId[]>();
			for (const id of op.ids) {
				result.set(id, Array.from(graph.neighbours(id, op.direction)));
			}
			return { tag: "batchNeighbours", value: result };
		}
		case "batchDegree": {
			const result = new Map<NodeId, number>();
			for (const id of op.ids) {
				result.set(id, graph.degree(id, op.direction));
			}
			return { tag: "batchDegree", value: result };
		}
		case "yield":
			return { tag: "yield" };
		case "progress":
			return { tag: "progress" };
	}
}

/**
 * Drive a generator to completion using a synchronous graph.
 *
 * The generator yields GraphOp requests; each is resolved immediately
 * against the graph and the tagged response is fed back via gen.next().
 *
 * @param gen - The generator to drive
 * @param graph - The graph to resolve ops against
 * @returns The generator's return value
 */
export function runSync<N extends NodeData, E extends EdgeData, R>(
	gen: Generator<GraphOp, R, GraphOpResponse<N, E>>,
	graph: ReadableGraph<N, E>,
): R {
	let step = gen.next();
	while (step.done !== true) {
		const response = resolveSyncOp(graph, step.value);
		step = gen.next(response);
	}
	return step.value;
}

// ---------------------------------------------------------------------------
// Async runner
// ---------------------------------------------------------------------------

/**
 * Resolve a single GraphOp against an async ReadableGraph.
 *
 * AsyncIterables (neighbours) are collected into readonly arrays so the
 * generator receives the same value type as in sync mode. Returns a tagged
 * GraphOpResponse for type-safe narrowing without assertions.
 *
 * @param graph - The async graph to query
 * @param op - The operation to resolve
 * @returns A promise resolving to the tagged response
 */
export async function resolveAsyncOp<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	op: GraphOp,
): Promise<GraphOpResponse<N, E>> {
	switch (op.tag) {
		case "neighbours":
			return {
				tag: "neighbours",
				value: await collectAsyncIterable(
					graph.neighbours(op.id, op.direction),
				),
			};
		case "degree":
			return { tag: "degree", value: await graph.degree(op.id, op.direction) };
		case "getNode":
			return { tag: "getNode", value: await graph.getNode(op.id) };
		case "getEdge":
			return {
				tag: "getEdge",
				value: await graph.getEdge(op.source, op.target),
			};
		case "hasNode":
			return { tag: "hasNode", value: await graph.hasNode(op.id) };
		case "batchNeighbours": {
			const promises = op.ids.map(async (id) => {
				const neighbours = await collectAsyncIterable(
					graph.neighbours(id, op.direction),
				);
				return [id, neighbours] as const;
			});
			const results = await Promise.all(promises);
			return { tag: "batchNeighbours", value: new Map(results) };
		}
		case "batchDegree": {
			const promises = op.ids.map(
				async (id) => [id, await graph.degree(id, op.direction)] as const,
			);
			const results = await Promise.all(promises);
			return { tag: "batchDegree", value: new Map(results) };
		}
		case "yield":
			return { tag: "yield" };
		case "progress":
			return { tag: "progress" };
	}
}

/**
 * Drive a generator to completion using an async graph.
 *
 * Extends sync semantics with:
 * - Cancellation via AbortSignal (throws DOMException "AbortError")
 * - Cooperative yielding at `yield` ops (calls yieldStrategy)
 * - Progress callbacks at `progress` ops (may be async for backpressure)
 * - Error propagation: graph errors are forwarded via gen.throw(); if the
 *   generator does not handle them, they propagate to the caller
 *
 * @param gen - The generator to drive
 * @param graph - The async graph to resolve ops against
 * @param options - Runner configuration
 * @returns A promise resolving to the generator's return value
 */
export async function runAsync<N extends NodeData, E extends EdgeData, R>(
	gen: Generator<GraphOp, R, GraphOpResponse<N, E>>,
	graph: AsyncReadableGraph<N, E>,
	options?: AsyncRunnerOptions,
): Promise<R> {
	const signal = options?.signal;
	const onProgress = options?.onProgress;
	const yieldStrategy = options?.yieldStrategy ?? defaultYieldStrategy;

	let step = gen.next();

	while (step.done !== true) {
		// Check for cancellation before processing each op. Throw the error
		// into the generator so that any finally blocks in the algorithm run
		// before the error propagates to the caller.
		if (signal?.aborted === true) {
			const abortError = new DOMException("Aborted", "AbortError");
			try {
				gen.throw(abortError);
			} catch {
				// Generator did not handle the error — propagate it
				throw abortError;
			}
			// Generator handled the error but we still honour cancellation
			throw abortError;
		}

		const op = step.value;

		// Handle cooperative yield ops without hitting the graph
		if (op.tag === "yield") {
			await yieldStrategy();
			step = gen.next({ tag: "yield" });
			continue;
		}

		// Handle progress ops: call the callback (awaiting if async)
		if (op.tag === "progress") {
			if (onProgress !== undefined) {
				const maybePromise = onProgress(op.stats);
				if (maybePromise instanceof Promise) {
					await maybePromise;
				}
			}
			step = gen.next({ tag: "progress" });
			continue;
		}

		// Resolve graph ops, forwarding any errors into the generator
		let response: GraphOpResponse<N, E>;
		try {
			response = await resolveAsyncOp(graph, op);
		} catch (error) {
			// Forward the error into the generator; if unhandled, it propagates
			step = gen.throw(error);
			continue;
		}

		step = gen.next(response);
	}

	return step.value;
}
