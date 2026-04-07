/**
 * Random Walk with Restart exploration.
 *
 * Baseline exploration strategy using multiple random walks from each seed.
 * Walks proceed by uniformly sampling a neighbour at each step. With
 * probability `restartProbability` the walk restarts from the originating
 * seed node, simulating Personalised PageRank dynamics.
 *
 * Path detection: when a walk visits a node that was previously reached
 * by a walk from a different seed, an inter-seed path is recorded.
 *
 * This algorithm does NOT use the BASE framework — it constructs an
 * ExplorationResult directly.
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../graph";
import type {
	Seed,
	ExplorationResult,
	ExplorationPath,
	ExplorationStats,
} from "./types";

/**
 * Configuration for random-walk-with-restart exploration.
 */
export interface RandomWalkConfig {
	/** Probability of restarting a walk from its seed node (default: 0.15). */
	readonly restartProbability?: number;
	/** Number of walks to perform per seed node (default: 10). */
	readonly walks?: number;
	/** Maximum steps per walk (default: 20). */
	readonly walkLength?: number;
	/** Random seed for deterministic reproducibility (default: 0). */
	readonly seed?: number;
}

/**
 * Mulberry32 seeded PRNG — fast, compact, and high-quality for simulation.
 *
 * Returns a closure that yields the next pseudo-random value in [0, 1)
 * on each call.
 *
 * @param seed - 32-bit integer seed
 */
function mulberry32(seed: number): () => number {
	let s = seed;
	return (): number => {
		s += 0x6d2b79f5;
		let t = s;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
	};
}

/**
 * Run random-walk-with-restart exploration.
 *
 * For each seed, performs `walks` independent random walks of up to
 * `walkLength` steps. At each step the walk either restarts (with
 * probability `restartProbability`) or moves to a uniformly sampled
 * neighbour. All visited nodes and traversed edges are collected.
 *
 * Inter-seed paths are detected when a walk reaches a node that was
 * previously reached by a walk originating from a different seed.
 * The recorded path contains only the two seed endpoints rather than
 * the full walk trajectory, consistent with the ExplorationPath contract.
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for exploration
 * @param config - Random walk configuration
 * @returns Expansion result with discovered paths
 */
export function randomWalk<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: RandomWalkConfig,
): ExplorationResult {
	const startTime = performance.now();

	const {
		restartProbability = 0.15,
		walks = 10,
		walkLength = 20,
		seed = 0,
	} = config ?? {};

	if (seeds.length === 0) {
		return emptyResult(startTime);
	}

	const rand = mulberry32(seed);

	// Map each visited node to the index of the seed whose walk first reached it
	const firstVisitedBySeed = new Map<NodeId, number>();
	const allVisited = new Set<NodeId>();
	const sampledEdgeMap = new Map<NodeId, Set<NodeId>>();

	// Paths discovered when walks from different seeds collide
	const discoveredPaths: ExplorationPath[] = [];

	let iterations = 0;
	let edgesTraversed = 0;

	// Track which nodes were visited by each frontier for visitedPerFrontier
	const visitedPerFrontier: Set<NodeId>[] = seeds.map(() => new Set<NodeId>());

	for (let seedIdx = 0; seedIdx < seeds.length; seedIdx++) {
		const seed_ = seeds[seedIdx];
		if (seed_ === undefined) continue;

		const seedId = seed_.id;
		if (!graph.hasNode(seedId)) continue;

		// Mark the seed itself as visited
		if (!firstVisitedBySeed.has(seedId)) {
			firstVisitedBySeed.set(seedId, seedIdx);
		}
		allVisited.add(seedId);
		visitedPerFrontier[seedIdx]?.add(seedId);

		for (let w = 0; w < walks; w++) {
			let current = seedId;

			for (let step = 0; step < walkLength; step++) {
				iterations++;

				// Restart with configured probability
				if (rand() < restartProbability) {
					current = seedId;
					continue;
				}

				// Collect neighbours into an array for random sampling
				const neighbourList: NodeId[] = [];
				for (const nb of graph.neighbours(current)) {
					neighbourList.push(nb);
				}

				if (neighbourList.length === 0) {
					// Dead end — restart
					current = seedId;
					continue;
				}

				// Uniform random neighbour selection
				const nextIdx = Math.floor(rand() * neighbourList.length);
				const next = neighbourList[nextIdx];
				if (next === undefined) {
					current = seedId;
					continue;
				}

				edgesTraversed++;

				// Record traversed edge (canonical order)
				const [s, t] = current < next ? [current, next] : [next, current];
				let targets = sampledEdgeMap.get(s);
				if (targets === undefined) {
					targets = new Set();
					sampledEdgeMap.set(s, targets);
				}
				targets.add(t);

				// Path detection: collision with a walk from a different seed
				const previousSeedIdx = firstVisitedBySeed.get(next);
				if (previousSeedIdx !== undefined && previousSeedIdx !== seedIdx) {
					const fromSeed = seeds[previousSeedIdx];
					const toSeed = seeds[seedIdx];
					if (fromSeed !== undefined && toSeed !== undefined) {
						// Record a path between the two seed endpoints
						const path: ExplorationPath = {
							fromSeed,
							toSeed,
							nodes: [fromSeed.id, next, toSeed.id].filter(
								// Deduplicate when next happens to be a seed itself
								(n, i, arr) => arr.indexOf(n) === i,
							),
						};
						// Avoid duplicate seed-pair paths
						const alreadyFound = discoveredPaths.some(
							(p) =>
								(p.fromSeed.id === fromSeed.id && p.toSeed.id === toSeed.id) ||
								(p.fromSeed.id === toSeed.id && p.toSeed.id === fromSeed.id),
						);
						if (!alreadyFound) {
							discoveredPaths.push(path);
						}
					}
				}

				if (!firstVisitedBySeed.has(next)) {
					firstVisitedBySeed.set(next, seedIdx);
				}
				allVisited.add(next);
				visitedPerFrontier[seedIdx]?.add(next);

				current = next;
			}
		}
	}

	const endTime = performance.now();

	// Convert sampled edge map to set of tuples
	const edgeTuples = new Set<readonly [NodeId, NodeId]>();
	for (const [source, targets] of sampledEdgeMap) {
		for (const target of targets) {
			edgeTuples.add([source, target] as const);
		}
	}

	const stats: ExplorationStats = {
		iterations,
		nodesVisited: allVisited.size,
		edgesTraversed,
		pathsFound: discoveredPaths.length,
		durationMs: endTime - startTime,
		algorithm: "random-walk",
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
 * Create an empty result for early termination (no seeds).
 */
function emptyResult(startTime: number): ExplorationResult {
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
			algorithm: "random-walk",
			termination: "exhausted",
		},
	};
}
