/**
 * BASE generator core.
 *
 * Contains the expansion loop as a generator function that yields GraphOp
 * objects instead of calling the graph directly. This allows the same logic
 * to be driven by either `runSync` (for in-process graphs) or `runAsync`
 * (for remote/lazy graphs).
 *
 * Used by `base()` (via `runSync`) and `baseAsync()` (via `runAsync`).
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../graph";
import { PriorityQueue } from "../structures/priority-queue";
import type { GraphOp, GraphOpResponse } from "../async/protocol";
import { opNeighbours, opDegree } from "../async/ops";
import type {
	Seed,
	ExpansionResult,
	ExpansionPath,
	ExpansionStats,
	ExpansionConfig,
	PriorityContext,
	BatchPriorityContext,
} from "./types";
import {
	type QueueEntry,
	type ExpansionLimits,
	continueExpansion,
	reconstructPath,
	emptyResult,
} from "./base-helpers";

/**
 * Default priority function — degree-ordered (DOME).
 *
 * Lower degree = higher priority, so sparse nodes are explored before hubs.
 */
function degreePriority<N extends NodeData, E extends EdgeData>(
	_nodeId: NodeId,
	context: PriorityContext<N, E>,
): number {
	return context.degree;
}

/**
 * Generator core of the BASE expansion algorithm.
 *
 * Yields GraphOp objects to request graph data, allowing the caller to
 * provide a sync or async runner. The optional `graphRef` parameter is
 * required when the priority function accesses `context.graph` — it is
 * populated in sync mode by `base()`. In async mode (Phase 4+), a proxy
 * graph may be supplied instead.
 *
 * @param graphMeta - Immutable graph metadata (directed, nodeCount, edgeCount)
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion configuration (priority, limits, debug)
 * @param graphRef - Optional real graph reference for context.graph in priority functions
 * @returns An ExpansionResult with all discovered paths and statistics
 */
export function* baseCore<N extends NodeData, E extends EdgeData>(
	graphMeta: {
		readonly directed: boolean;
		readonly nodeCount: number;
		readonly edgeCount: number;
	},
	seeds: readonly Seed[],
	config?: ExpansionConfig<N, E>,
	graphRef?: ReadableGraph<N, E>,
): Generator<GraphOp, ExpansionResult, GraphOpResponse<N, E>> {
	const startTime = performance.now();

	const {
		maxNodes = 0,
		maxIterations = 0,
		maxPaths = 0,
		priority = degreePriority,
		batchPriority,
		debug = false,
	} = config ?? {};

	if (seeds.length === 0) {
		return emptyResult("base", startTime);
	}

	// Initialise frontiers — one per seed
	const numFrontiers = seeds.length;
	const allVisited = new Set<NodeId>();
	const combinedVisited = new Map<NodeId, number>();
	const visitedByFrontier: Map<NodeId, number>[] = [];
	const predecessors: Map<NodeId, NodeId | null>[] = [];
	const queues: PriorityQueue<QueueEntry>[] = [];

	for (let i = 0; i < numFrontiers; i++) {
		visitedByFrontier.push(new Map());
		predecessors.push(new Map());
		queues.push(new PriorityQueue<QueueEntry>());

		const seed = seeds[i];
		if (seed === undefined) continue;

		const seedNode = seed.id;
		// Note: seed is NOT marked as visited here — it will be marked when processed
		// like any other node, so it can be properly expanded.
		predecessors[i]?.set(seedNode, null);
		combinedVisited.set(seedNode, i);
		allVisited.add(seedNode);

		// Yield to get the seed's degree for priority context
		const seedDegree = yield* opDegree<N, E>(seedNode);

		const context = buildPriorityContext<N, E>(
			seedNode,
			i,
			combinedVisited,
			allVisited,
			[],
			0,
			seedDegree,
			graphRef,
		);

		const seedPriority = priority(seedNode, context);
		queues[i]?.push(
			{
				nodeId: seedNode,
				frontierIndex: i,
				predecessor: null,
			},
			seedPriority,
		);
	}

	const sampledEdgeMap = new Map<NodeId, Set<NodeId>>();
	const discoveredPaths: ExpansionPath[] = [];
	let iterations = 0;
	let edgesTraversed = 0;
	let termination: ExpansionStats["termination"] = "exhausted";

	const limits: ExpansionLimits = { maxIterations, maxNodes, maxPaths };

	// Main expansion loop — limits are checked at the start of each iteration
	for (;;) {
		const check = continueExpansion(
			iterations,
			allVisited.size,
			discoveredPaths.length,
			limits,
		);
		if (!check.shouldContinue) {
			termination = check.termination;
			break;
		}

		// Find the frontier with the globally lowest-priority entry
		let lowestPriority = Number.POSITIVE_INFINITY;
		let activeFrontier = -1;

		for (let i = 0; i < numFrontiers; i++) {
			const queue = queues[i];
			if (queue !== undefined && !queue.isEmpty()) {
				const peek = queue.peek();
				if (peek !== undefined && peek.priority < lowestPriority) {
					lowestPriority = peek.priority;
					activeFrontier = i;
				}
			}
		}

		// All queues empty — expansion exhausted
		if (activeFrontier < 0) {
			termination = "exhausted";
			break;
		}

		const queue = queues[activeFrontier];
		if (queue === undefined) break;

		const entry = queue.pop();
		if (entry === undefined) break;

		const { nodeId, predecessor } = entry.item;

		// Skip if already visited by this frontier
		const frontierVisited = visitedByFrontier[activeFrontier];
		if (frontierVisited === undefined || frontierVisited.has(nodeId)) {
			continue;
		}

		// Mark visited
		frontierVisited.set(nodeId, activeFrontier);
		combinedVisited.set(nodeId, activeFrontier);
		if (predecessor !== null) {
			const predMap = predecessors[activeFrontier];
			if (predMap !== undefined) {
				predMap.set(nodeId, predecessor);
			}
		}
		allVisited.add(nodeId);

		if (debug) {
			console.log(
				`[BASE] Iteration ${String(iterations)}: Frontier ${String(activeFrontier)} visiting ${nodeId}`,
			);
		}

		// Check for collision with other frontiers
		for (let otherFrontier = 0; otherFrontier < numFrontiers; otherFrontier++) {
			if (otherFrontier === activeFrontier) continue;

			const otherVisited = visitedByFrontier[otherFrontier];
			if (otherVisited === undefined) continue;

			if (otherVisited.has(nodeId)) {
				// Collision! Reconstruct the path between the two frontiers.
				const path = reconstructPath(
					nodeId,
					activeFrontier,
					otherFrontier,
					predecessors,
					seeds,
				);
				if (path !== null) {
					discoveredPaths.push(path);
					if (debug) {
						console.log(`[BASE] Path found: ${path.nodes.join(" -> ")}`);
					}
				}
			}
		}

		// Expand neighbours — yield to the runner to retrieve them
		const neighbours = yield* opNeighbours<N, E>(nodeId);

		// Track sampled edges (normalised so source < target)
		for (const neighbour of neighbours) {
			edgesTraversed++;
			const [s, t] =
				nodeId < neighbour ? [nodeId, neighbour] : [neighbour, nodeId];
			let targets = sampledEdgeMap.get(s);
			if (targets === undefined) {
				targets = new Set();
				sampledEdgeMap.set(s, targets);
			}
			targets.add(t);
		}

		// Collect unvisited neighbours for batch processing
		const unvisitedNeighbours: NodeId[] = [];
		for (const neighbour of neighbours) {
			// Skip if already visited by this frontier
			const fv = visitedByFrontier[activeFrontier];
			if (fv === undefined || fv.has(neighbour)) {
				continue;
			}
			unvisitedNeighbours.push(neighbour);
		}

		if (unvisitedNeighbours.length > 0) {
			if (batchPriority) {
				// Use batch priority computation
				const batchContext: BatchPriorityContext<N, E> = {
					graph: graphRef ?? makeNoGraphSentinel<N, E>(),
					visited: allVisited,
					visitedByFrontier: combinedVisited,
					frontierId: activeFrontier,
					discoveredPaths,
				};

				const priorities = batchPriority(unvisitedNeighbours, batchContext);

				// Push all neighbours with their computed priorities
				for (const neighbour of unvisitedNeighbours) {
					const priority = priorities.get(neighbour);
					if (priority !== undefined) {
						queue.push(
							{
								nodeId: neighbour,
								frontierIndex: activeFrontier,
								predecessor: nodeId,
							},
							priority,
						);
					}
				}
			} else {
				// Use individual priority computation (existing path)
				for (const neighbour of unvisitedNeighbours) {
					// Yield to get the neighbour's degree for priority context
					const neighbourDegree = yield* opDegree<N, E>(neighbour);

					const context = buildPriorityContext<N, E>(
						neighbour,
						activeFrontier,
						combinedVisited,
						allVisited,
						discoveredPaths,
						iterations + 1,
						neighbourDegree,
						graphRef,
					);

					const neighbourPriority = priority(neighbour, context);

					queue.push(
						{
							nodeId: neighbour,
							frontierIndex: activeFrontier,
							predecessor: nodeId,
						},
						neighbourPriority,
					);
				}
			}
		}

		iterations++;
	}

	const endTime = performance.now();
	const visitedPerFrontier = visitedByFrontier.map((m) => new Set(m.keys()));

	// Convert sampled edges to readonly tuples
	const edgeTuples = new Set<readonly [NodeId, NodeId]>();
	for (const [source, targets] of sampledEdgeMap) {
		for (const target of targets) {
			edgeTuples.add([source, target] as const);
		}
	}

	return {
		paths: discoveredPaths,
		sampledNodes: allVisited,
		sampledEdges: edgeTuples,
		visitedPerFrontier,
		stats: {
			iterations,
			nodesVisited: allVisited.size,
			edgesTraversed,
			pathsFound: discoveredPaths.length,
			durationMs: endTime - startTime,
			algorithm: "base",
			termination,
		},
	};
}

/**
 * Create a sentinel ReadableGraph that throws if any member is accessed.
 *
 * Used in async mode when no graphRef is provided. Gives a clear error
 * message rather than silently returning incorrect results if a priority
 * function attempts to access `context.graph` before Phase 4b introduces
 * a real async proxy.
 */
function makeNoGraphSentinel<
	N extends NodeData,
	E extends EdgeData,
>(): ReadableGraph<N, E> {
	const msg =
		"Priority function accessed context.graph in async mode without a graph proxy. " +
		"Pass a graphRef or use a priority function that does not access context.graph.";
	const fail = (): never => {
		throw new Error(msg);
	};
	return {
		get directed(): boolean {
			return fail();
		},
		get nodeCount(): number {
			return fail();
		},
		get edgeCount(): number {
			return fail();
		},
		hasNode: fail,
		getNode: fail,
		nodeIds: fail,
		neighbours: fail,
		degree: fail,
		getEdge: fail,
		edges: fail,
	};
}

/**
 * Build a PriorityContext for a node using a pre-fetched degree.
 *
 * When `graphRef` is provided (sync mode), it is used as `context.graph` so
 * priority functions can access the graph directly. When it is absent (async
 * mode), a Proxy is used in its place that throws a clear error if any
 * property is accessed — this prevents silent failures until Phase 4b
 * introduces a real async proxy graph.
 */
function buildPriorityContext<N extends NodeData, E extends EdgeData>(
	_nodeId: NodeId,
	frontierIndex: number,
	combinedVisited: ReadonlyMap<NodeId, number>,
	allVisited: ReadonlySet<NodeId>,
	discoveredPaths: readonly ExpansionPath[],
	iteration: number,
	degree: number,
	graphRef: ReadableGraph<N, E> | undefined,
): PriorityContext<N, E> {
	// Resolve the graph reference. In async mode without a proxy, we construct
	// a sentinel that satisfies the ReadableGraph<N, E> interface structurally
	// but throws a clear error if any method is called. Phase 4b will replace
	// this with a real async proxy graph.
	const graph: ReadableGraph<N, E> = graphRef ?? makeNoGraphSentinel<N, E>();

	return {
		graph,
		degree,
		frontierIndex,
		visitedByFrontier: combinedVisited,
		allVisited,
		discoveredPaths,
		iteration,
	};
}
