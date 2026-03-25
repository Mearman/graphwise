/**
 * Batched async runner for generator-based graph algorithms.
 *
 * Handles both single ops (by converting to batch-of-one) and explicit batch ops.
 * The batching optimization comes from:
 * 1. Generators explicitly yielding batch ops when they know they need multiple results
 * 2. Graph implementations can cache/prefetch internally
 */

import type { NodeData, EdgeData } from "../graph";
import type { AsyncReadableGraph } from "../graph/async-interfaces";
import type { GraphOp, GraphOpResponse } from "./protocol";
import type { AsyncRunnerOptions } from "./types";
import { resolveAsyncOp } from "./runners";
import { defaultYieldStrategy } from "./utils";

export interface BatchRunnerOptions extends AsyncRunnerOptions {
	/** max ops to collect per batch (reserved for future use) */
	readonly batchSize?: number;
}

/**
 * Drive a generator to completion using batched graph operations.
 *
 * When the generator yields explicit batch ops (batchNeighbours, batchDegree),
 * resolves them efficiently. Single ops are converted to batch-of-one and resolved.
 *
 * @param gen - The generator to drive
 * @param graph - Async graph to resolve ops against
 * @param options - Runner configuration
 * @returns Promise resolving to the generator's return value
 */
export async function runBatched<
	R,
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
>(
	gen: Generator<GraphOp, R, GraphOpResponse<N, E>>,
	graph: AsyncReadableGraph<N, E>,
	options?: BatchRunnerOptions,
): Promise<R> {
	const signal = options?.signal;
	const onProgress = options?.onProgress;
	const yieldStrategy = options?.yieldStrategy ?? defaultYieldStrategy;

	let step = gen.next();

	while (step.done !== true) {
		// Check for cancellation
		if (signal?.aborted === true) {
			const abortError = new DOMException("Aborted", "AbortError");
			try {
				gen.throw(abortError);
			} catch {
				// Generator did not handle the error
				throw abortError;
			}
			throw abortError;
		}

		const op = step.value;

		// Handle cooperative yield ops
		if (op.tag === "yield") {
			await yieldStrategy();
			step = gen.next({ tag: "yield" });
			continue;
		}

		// Handle progress ops
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

		// Handle explicit batch ops from generator
		if (op.tag === "batchNeighbours" || op.tag === "batchDegree") {
			const response = await resolveAsyncOp(graph, op);
			step = gen.next(response);
			continue;
		}

		// Handle single neighbours op - convert to batch-of-one
		if (op.tag === "neighbours") {
			const batchOp =
				op.direction !== undefined
					? {
							tag: "batchNeighbours" as const,
							ids: [op.id],
							direction: op.direction,
						}
					: { tag: "batchNeighbours" as const, ids: [op.id] };

			const batchResponse = await resolveAsyncOp(graph, batchOp);

			if (batchResponse.tag !== "batchNeighbours") {
				throw new TypeError(
					`Expected batchNeighbours response, got ${batchResponse.tag}`,
				);
			}

			const neighbours = batchResponse.value.get(op.id);
			step = gen.next({
				tag: "neighbours",
				value: neighbours ?? [],
			});
			continue;
		}

		// Handle single degree op - convert to batch-of-one
		if (op.tag === "degree") {
			const batchOp =
				op.direction !== undefined
					? {
							tag: "batchDegree" as const,
							ids: [op.id],
							direction: op.direction,
						}
					: { tag: "batchDegree" as const, ids: [op.id] };

			const batchResponse = await resolveAsyncOp(graph, batchOp);

			if (batchResponse.tag !== "batchDegree") {
				throw new TypeError(
					`Expected batchDegree response, got ${batchResponse.tag}`,
				);
			}

			const degree = batchResponse.value.get(op.id);
			step = gen.next({
				tag: "degree",
				value: degree ?? 0,
			});
			continue;
		}

		// Handle other single ops (getNode, getEdge, hasNode)
		let response: GraphOpResponse<N, E>;
		try {
			response = await resolveAsyncOp(graph, op);
		} catch (error) {
			step = gen.throw(error);
			continue;
		}

		step = gen.next(response);
	}

	return step.value;
}
