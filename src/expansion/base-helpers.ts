/**
 * Pure helper functions for the BASE expansion engine.
 *
 * These functions are extracted from base.ts so they can be shared between
 * the synchronous `base()` entry point and the `baseCore` generator used by
 * both sync and async runners.
 *
 * All functions here are pure — they make no direct graph calls.
 */

import type { NodeId } from "../graph";
import type {
	Seed,
	ExpansionPath,
	ExpansionResult,
	ExpansionStats,
} from "./types";

/**
 * Internal queue entry for frontier expansion.
 */
export interface QueueEntry {
	nodeId: NodeId;
	frontierIndex: number;
	predecessor: NodeId | null;
}

/**
 * Limits structure used by continueExpansion.
 */
export interface ExpansionLimits {
	readonly maxIterations: number;
	readonly maxNodes: number;
	readonly maxPaths: number;
}

/**
 * Check whether expansion should continue given current progress.
 *
 * Returns shouldContinue=false as soon as any configured limit is reached,
 * along with the appropriate termination reason.
 *
 * @param iterations - Number of iterations completed so far
 * @param nodesVisited - Number of distinct nodes visited so far
 * @param pathsFound - Number of paths discovered so far
 * @param limits - Configured expansion limits (0 = unlimited)
 * @returns Whether to continue and the termination reason if stopping
 */
export function continueExpansion(
	iterations: number,
	nodesVisited: number,
	pathsFound: number,
	limits: ExpansionLimits,
): { shouldContinue: boolean; termination: ExpansionStats["termination"] } {
	if (limits.maxIterations > 0 && iterations >= limits.maxIterations) {
		return { shouldContinue: false, termination: "limit" };
	}
	if (limits.maxNodes > 0 && nodesVisited >= limits.maxNodes) {
		return { shouldContinue: false, termination: "limit" };
	}
	if (limits.maxPaths > 0 && pathsFound >= limits.maxPaths) {
		return { shouldContinue: false, termination: "limit" };
	}
	return { shouldContinue: true, termination: "exhausted" };
}

/**
 * Reconstruct path from collision point.
 *
 * Traces backwards through the predecessor maps of both frontiers from the
 * collision node, then concatenates the two halves to form the full path.
 *
 * @param collisionNode - The node where the two frontiers met
 * @param frontierA - Index of the first frontier
 * @param frontierB - Index of the second frontier
 * @param predecessors - Predecessor maps, one per frontier
 * @param seeds - Seed nodes, one per frontier
 * @returns The reconstructed path, or null if seeds are missing
 */
export function reconstructPath(
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
 * Create an empty expansion result for early termination (e.g. no seeds given).
 *
 * @param algorithm - Name of the algorithm producing this result
 * @param startTime - performance.now() timestamp taken before the algorithm began
 * @returns An ExpansionResult with zero paths and zero stats
 */
export function emptyResult(
	algorithm: string,
	startTime: number,
): ExpansionResult {
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
