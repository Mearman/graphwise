/**
 * K-Hop expansion.
 *
 * Fixed-depth BFS baseline that explores up to k hops from each seed.
 * Implements explicit depth-limited BFS with frontier collision detection
 * for path discovery between seeds. Each seed expands independently;
 * a path is recorded when a node visited by one seed's frontier is
 * encountered by another seed's frontier.
 *
 * Unlike the BASE framework, depth is tracked explicitly so the k-hop
 * constraint is exact rather than approximate.
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../graph";
import type {
	Seed,
	ExpansionResult,
	ExpansionPath,
	ExpansionStats,
} from "./types";
import type { ExpansionConfig } from "./types";

/**
 * Configuration for k-hop expansion.
 */
export interface KHopConfig<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> extends ExpansionConfig<N, E> {
	/**
	 * Maximum number of hops from any seed node.
	 * Defaults to 2.
	 */
	readonly k?: number;
}

/**
 * Run k-hop expansion (fixed-depth BFS).
 *
 * Explores all nodes reachable within exactly k hops of any seed using
 * breadth-first search. Paths between seeds are detected when a node
 * is reached by frontiers from two different seeds.
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - K-hop configuration (k defaults to 2)
 * @returns Expansion result with discovered paths
 */
export function kHop<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: KHopConfig<N, E>,
): ExpansionResult {
	const startTime = performance.now();

	const { k = 2 } = config ?? {};

	if (seeds.length === 0) {
		return emptyResult(startTime);
	}

	// Per-frontier state: visited nodes and predecessor map for path reconstruction
	const visitedByFrontier: Map<NodeId, NodeId | null>[] = seeds.map(
		(): Map<NodeId, NodeId | null> => new Map<NodeId, NodeId | null>(),
	);
	// Global map: node → frontier index that first visited it
	const firstVisitedBy = new Map<NodeId, number>();
	const allVisited = new Set<NodeId>();
	const sampledEdgeMap = new Map<NodeId, Set<NodeId>>();
	const discoveredPaths: ExpansionPath[] = [];

	let iterations = 0;
	let edgesTraversed = 0;

	// Initialise each frontier with its seed node
	for (let i = 0; i < seeds.length; i++) {
		const seed = seeds[i];
		if (seed === undefined) continue;
		if (!graph.hasNode(seed.id)) continue;

		visitedByFrontier[i]?.set(seed.id, null);
		allVisited.add(seed.id);

		if (!firstVisitedBy.has(seed.id)) {
			firstVisitedBy.set(seed.id, i);
		} else {
			// Seed collision: two seeds are the same node — record trivial path
			const otherIdx = firstVisitedBy.get(seed.id) ?? -1;
			if (otherIdx < 0) continue;
			const fromSeed = seeds[otherIdx];
			const toSeed = seeds[i];
			if (fromSeed !== undefined && toSeed !== undefined) {
				discoveredPaths.push({ fromSeed, toSeed, nodes: [seed.id] });
			}
		}
	}

	// BFS level-by-level for each frontier simultaneously
	// Current frontier for each seed: nodes to expand at the next hop depth
	let currentLevel: NodeId[][] = seeds.map((s, i): NodeId[] => {
		const frontier = visitedByFrontier[i];
		if (frontier === undefined) return [];
		return frontier.has(s.id) ? [s.id] : [];
	});

	for (let hop = 0; hop < k; hop++) {
		const nextLevel: NodeId[][] = seeds.map(() => []);

		for (let i = 0; i < seeds.length; i++) {
			const level = currentLevel[i];
			if (level === undefined) continue;

			const frontierVisited = visitedByFrontier[i];
			if (frontierVisited === undefined) continue;

			for (const nodeId of level) {
				iterations++;

				for (const neighbour of graph.neighbours(nodeId)) {
					edgesTraversed++;

					// Track sampled edge in canonical order
					const [s, t] =
						nodeId < neighbour ? [nodeId, neighbour] : [neighbour, nodeId];
					let targets = sampledEdgeMap.get(s);
					if (targets === undefined) {
						targets = new Set();
						sampledEdgeMap.set(s, targets);
					}
					targets.add(t);

					// Skip if this frontier has already visited this neighbour
					if (frontierVisited.has(neighbour)) continue;

					frontierVisited.set(neighbour, nodeId);
					allVisited.add(neighbour);
					nextLevel[i]?.push(neighbour);

					// Path detection: collision with another frontier
					const previousFrontier = firstVisitedBy.get(neighbour);
					if (previousFrontier !== undefined && previousFrontier !== i) {
						const fromSeed = seeds[previousFrontier];
						const toSeed = seeds[i];
						if (fromSeed !== undefined && toSeed !== undefined) {
							const path = reconstructPath(
								neighbour,
								previousFrontier,
								i,
								visitedByFrontier,
								seeds,
							);
							if (path !== null) {
								const alreadyFound = discoveredPaths.some(
									(p) =>
										(p.fromSeed.id === fromSeed.id &&
											p.toSeed.id === toSeed.id) ||
										(p.fromSeed.id === toSeed.id &&
											p.toSeed.id === fromSeed.id),
								);
								if (!alreadyFound) {
									discoveredPaths.push(path);
								}
							}
						}
					}

					if (!firstVisitedBy.has(neighbour)) {
						firstVisitedBy.set(neighbour, i);
					}
				}
			}
		}

		currentLevel = nextLevel;

		// Stop early if all frontiers are exhausted
		if (currentLevel.every((level) => level.length === 0)) break;
	}

	const endTime = performance.now();

	// Convert sampled edge map to set of tuples
	const edgeTuples = new Set<readonly [NodeId, NodeId]>();
	for (const [source, targets] of sampledEdgeMap) {
		for (const target of targets) {
			edgeTuples.add([source, target] as const);
		}
	}

	const visitedPerFrontier = visitedByFrontier.map((m) => new Set(m.keys()));

	const stats: ExpansionStats = {
		iterations,
		nodesVisited: allVisited.size,
		edgesTraversed,
		pathsFound: discoveredPaths.length,
		durationMs: endTime - startTime,
		algorithm: "k-hop",
		termination: "exhausted",
	};

	return {
		paths: discoveredPaths,
		sampledNodes: allVisited,
		sampledEdges: edgeTuples,
		visitedPerFrontier,
		stats,
	};
}

/**
 * Reconstruct the path between two colliding frontiers.
 */
function reconstructPath(
	collisionNode: NodeId,
	frontierA: number,
	frontierB: number,
	visitedByFrontier: readonly Map<NodeId, NodeId | null>[],
	seeds: readonly Seed[],
): ExpansionPath | null {
	const seedA = seeds[frontierA];
	const seedB = seeds[frontierB];
	if (seedA === undefined || seedB === undefined) return null;

	// Trace back from collision node through frontier A to its seed
	const pathA: NodeId[] = [collisionNode];
	const predA = visitedByFrontier[frontierA];
	if (predA !== undefined) {
		let node: NodeId | null | undefined = collisionNode;
		let pred: NodeId | null | undefined = predA.get(node);
		while (pred !== null && pred !== undefined) {
			pathA.unshift(pred);
			node = pred;
			pred = predA.get(node);
		}
	}

	// Trace back from collision node through frontier B to its seed
	const pathB: NodeId[] = [];
	const predB = visitedByFrontier[frontierB];
	if (predB !== undefined) {
		let node: NodeId | null | undefined = collisionNode;
		let pred: NodeId | null | undefined = predB.get(node);
		while (pred !== null && pred !== undefined) {
			pathB.push(pred);
			node = pred;
			pred = predB.get(node);
		}
	}

	return {
		fromSeed: seedA,
		toSeed: seedB,
		nodes: [...pathA, ...pathB],
	};
}

/**
 * Create an empty result for early termination (no seeds).
 */
function emptyResult(startTime: number): ExpansionResult {
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
			algorithm: "k-hop",
			termination: "exhausted",
		},
	};
}
