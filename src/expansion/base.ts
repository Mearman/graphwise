/**
 * BASE (Bidirectional Adaptive Seed Expansion) engine.
 *
 * Core algorithm implementing priority-ordered bidirectional expansion
 * with frontier collision detection for path discovery.
 *
 * Key properties:
 * 1. Priority-ordered exploration - global min-priority across all frontiers
 * 2. Frontier collision detection - path recorded when frontiers meet
 * 3. Implicit termination - halts when all queues empty
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../graph";
import { PriorityQueue } from "../structures/priority-queue";
import type {
	Seed,
	ExpansionResult,
	ExpansionPath,
	ExpansionStats,
	ExpansionConfig,
	PriorityContext,
} from "./types";

/**
 * Internal queue entry for frontier expansion.
 */
interface QueueEntry {
	nodeId: NodeId;
	frontierIndex: number;
	predecessor: NodeId | null;
}

/**
 * Default priority function - degree-ordered (DOME).
 */
function degreePriority<N extends NodeData, E extends EdgeData>(
	_nodeId: NodeId,
	context: PriorityContext<N, E>,
): number {
	return context.degree;
}

/**
 * Run BASE expansion algorithm.
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function base<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: ExpansionConfig<N, E>,
): ExpansionResult {
	const startTime = performance.now();

	const {
		maxNodes = 0,
		maxIterations = 0,
		maxPaths = 0,
		priority = degreePriority,
		debug = false,
	} = config ?? {};

	if (seeds.length === 0) {
		return emptyResult("base", startTime);
	}

	// Initialise frontiers - one per seed
	const numFrontiers = seeds.length;
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
		// Note: seed is NOT marked as visited here - it will be marked when processed
		// like any other node. This allows the seed to be properly expanded.
		predecessors[i]?.set(seedNode, null);

		const context = createPriorityContext(
			graph,
			seedNode,
			i,
			visitedByFrontier,
			[],
			0,
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

	const allVisited = new Set<NodeId>();
	const sampledEdges = new Set<string>();
	const discoveredPaths: ExpansionPath[] = [];
	let iterations = 0;
	let edgesTraversed = 0;
	let termination: ExpansionStats["termination"] = "exhausted";

	// Main expansion loop
	const continueExpansion = (): boolean => {
		if (maxIterations > 0 && iterations >= maxIterations) {
			termination = "limit";
			return false;
		}
		if (maxNodes > 0 && allVisited.size >= maxNodes) {
			termination = "limit";
			return false;
		}
		if (maxPaths > 0 && discoveredPaths.length >= maxPaths) {
			termination = "limit";
			return false;
		}
		return true;
	};

	while (continueExpansion()) {
		// Find frontier with lowest priority entry
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

		// All queues empty - exhausted
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
				// Collision! Reconstruct path
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

		// Expand neighbours
		const neighbours = graph.neighbours(nodeId);
		for (const neighbour of neighbours) {
			edgesTraversed++;

			// Track sampled edge
			const edgeKey =
				nodeId < neighbour
					? `${nodeId}::${neighbour}`
					: `${neighbour}::${nodeId}`;
			sampledEdges.add(edgeKey);

			// Skip if already visited by this frontier
			const frontierVisited = visitedByFrontier[activeFrontier];
			if (frontierVisited === undefined || frontierVisited.has(neighbour)) {
				continue;
			}

			const context = createPriorityContext(
				graph,
				neighbour,
				activeFrontier,
				visitedByFrontier,
				discoveredPaths,
				iterations + 1,
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

		iterations++;
	}

	const endTime = performance.now();
	const visitedPerFrontier = visitedByFrontier.map((m) => new Set(m.keys()));

	// Convert sampled edges to tuples
	const edgeTuples = new Set<readonly [NodeId, NodeId]>();
	for (const edgeKey of sampledEdges) {
		const parts = edgeKey.split("::");
		if (parts.length === 2) {
			const source = parts[0];
			const target = parts[1];
			if (source !== undefined && target !== undefined) {
				edgeTuples.add([source, target] as const);
			}
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
 * Create priority context for a node.
 */
function createPriorityContext<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	nodeId: NodeId,
	frontierIndex: number,
	visitedByFrontier: readonly Map<NodeId, number>[],
	discoveredPaths: readonly ExpansionPath[],
	iteration: number,
): PriorityContext<N, E> {
	const combinedVisited = new Map<NodeId, number>();
	for (const frontierMap of visitedByFrontier) {
		for (const [id, idx] of frontierMap) {
			combinedVisited.set(id, idx);
		}
	}

	const allVisited = new Set<NodeId>(combinedVisited.keys());

	return {
		graph,
		degree: graph.degree(nodeId),
		frontierIndex,
		visitedByFrontier: combinedVisited,
		allVisited,
		discoveredPaths,
		iteration,
	};
}

/**
 * Reconstruct path from collision point.
 */
function reconstructPath(
	collisionNode: NodeId,
	frontierA: number,
	frontierB: number,
	predecessors: readonly Map<NodeId, NodeId | null>[],
	seeds: readonly Seed[],
): ExpansionPath | null {
	const pathA: NodeId[] = [collisionNode];
	const predA = predecessors[frontierA];
	if (predA !== undefined) {
		let node: NodeId | null | undefined = collisionNode;
		let next: NodeId | null | undefined = predA.get(node);
		while (next !== null && next !== undefined) {
			node = next;
			pathA.unshift(node);
			next = predA.get(node);
		}
	}

	const pathB: NodeId[] = [];
	const predB = predecessors[frontierB];
	if (predB !== undefined) {
		let node: NodeId | null | undefined = collisionNode;
		let next: NodeId | null | undefined = predB.get(node);
		while (next !== null && next !== undefined) {
			node = next;
			pathB.push(node);
			next = predB.get(node);
		}
	}

	const fullPath = [...pathA, ...pathB];

	const seedA = seeds[frontierA];
	const seedB = seeds[frontierB];

	if (seedA === undefined || seedB === undefined) {
		return null;
	}

	return {
		fromSeed: seedA,
		toSeed: seedB,
		nodes: fullPath,
	};
}

/**
 * Create an empty result for early termination.
 */
function emptyResult(algorithm: string, startTime: number): ExpansionResult {
	return {
		paths: [],
		sampledNodes: new Set(),
		sampledEdges: new Set(),
		visitedPerFrontier: [],
		stats: {
			iterations: 0,
			nodesVisited: 0,
			edgesTraversed: 0,
			pathsFound: 0,
			durationMs: performance.now() - startTime,
			algorithm,
			termination: "exhausted",
		},
	};
}
