/**
 * Shared helper functions for exploration algorithm priority computations.
 *
 * These utilities encapsulate repeated computation patterns across
 * multiple exploration algorithms.
 *
 * @module exploration/priority-helpers
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../graph";
import type {
	PriorityContext,
	ExplorationPath,
	BatchPriorityContext,
} from "./types";
import { graphToCSR } from "../gpu/csr";
import {
	intersectionBatch,
	jaccardFromIntersection,
	type IntersectionResult,
} from "../gpu/kernels/intersection/logic";

/**
 * Compute average MI between each candidate and a set of reference nodes.
 *
 * Uses batch intersection computation for efficiency. Returns a Map of
 * candidate ID to average MI score.
 *
 * @param graph - Source graph
 * @param candidates - Candidate node IDs to compute priorities for
 * @param referenceNodes - Reference nodes to compute MI against
 * @returns Map of candidate ID to average MI score
 */
export function batchAvgMI<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	candidates: readonly NodeId[],
	referenceNodes: ReadonlySet<NodeId>,
): ReadonlyMap<NodeId, number> {
	const result = new Map<NodeId, number>();

	if (candidates.length === 0 || referenceNodes.size === 0) {
		for (const candidate of candidates) {
			result.set(candidate, 0);
		}
		return result;
	}

	// Convert to CSR for efficient batch computation
	const { csr, indexMap } = graphToCSR(graph);
	const { nodeToIndex } = indexMap;

	// Build pairs: (candidate, referenceNode) for all combinations
	const pairs: (readonly [number, number])[] = [];
	const pairToCandidate = new Map<number, NodeId>(); // Maps pair index back to candidate

	const referenceArray = Array.from(referenceNodes);

	for (const candidate of candidates) {
		const candIdx = nodeToIndex.get(candidate);
		if (candIdx === undefined) {
			// Node not in CSR (shouldn't happen for valid candidates)
			result.set(candidate, 0);
			continue;
		}

		const startIdx = pairs.length;
		for (const refNode of referenceArray) {
			const refIdx = nodeToIndex.get(refNode);
			if (refIdx !== undefined && refIdx !== candIdx) {
				pairs.push([candIdx, refIdx]);
			}
		}
		const endIdx = pairs.length;

		// Track which pairs belong to this candidate
		for (let i = startIdx; i < endIdx; i++) {
			pairToCandidate.set(i, candidate);
		}
	}

	if (pairs.length === 0) {
		for (const candidate of candidates) {
			if (!result.has(candidate)) {
				result.set(candidate, 0);
			}
		}
		return result;
	}

	// Compute all intersections in batch
	const { intersections, sizeUs, sizeVs } = intersectionBatch(
		csr.rowOffsets,
		csr.colIndices,
		pairs,
	);

	// Aggregate MI scores per candidate
	const candidateScores = new Map<NodeId, { total: number; count: number }>();

	for (let i = 0; i < pairs.length; i++) {
		const candidate = pairToCandidate.get(i);
		if (candidate === undefined) continue;

		const intersectionResult: IntersectionResult = {
			intersection: intersections[i] ?? 0,
			sizeU: sizeUs[i] ?? 0,
			sizeV: sizeVs[i] ?? 0,
		};

		const mi = jaccardFromIntersection(intersectionResult);
		const existing = candidateScores.get(candidate);
		if (existing === undefined) {
			candidateScores.set(candidate, { total: mi, count: 1 });
		} else {
			existing.total += mi;
			existing.count++;
		}
	}

	// Compute averages
	for (const candidate of candidates) {
		const scores = candidateScores.get(candidate);
		if (scores === undefined || scores.count === 0) {
			result.set(candidate, 0);
		} else {
			result.set(candidate, scores.total / scores.count);
		}
	}

	return result;
}

/**
 * Compute the average mutual information between a node and all visited
 * nodes in the same frontier.
 *
 * Returns a value in [0, 1] — higher means the node is more similar
 * (on average) to already-visited same-frontier nodes.
 *
 * @param graph - Source graph
 * @param nodeId - Node being prioritised
 * @param context - Current priority context
 * @param mi - MI function to use for pairwise scoring
 * @returns Average MI score, or 0 if no same-frontier visited nodes exist
 */
export function avgFrontierMI<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	nodeId: NodeId,
	context: PriorityContext<N, E>,
	mi: (graph: ReadableGraph<N, E>, source: string, target: string) => number,
): number {
	const { frontierIndex, visitedByFrontier } = context;

	let total = 0;
	let count = 0;

	for (const [visitedId, idx] of visitedByFrontier) {
		if (idx === frontierIndex && visitedId !== nodeId) {
			total += mi(graph, visitedId, nodeId);
			count++;
		}
	}

	return count > 0 ? total / count : 0;
}

/**
 * Get nodes visited by the same frontier (for batch MI computation).
 *
 * @param context - Batch priority context
 * @returns Set of node IDs visited by the same frontier
 */
export function getSameFrontierVisited<N extends NodeData, E extends EdgeData>(
	context: BatchPriorityContext<N, E>,
): Set<NodeId> {
	const result = new Set<NodeId>();
	for (const [nodeId, frontierIdx] of context.visitedByFrontier) {
		if (frontierIdx === context.frontierId) {
			result.add(nodeId);
		}
	}
	return result;
}

/**
 * Count the number of a node's neighbours that have been visited by
 * frontiers other than the node's own frontier.
 *
 * A higher count indicates this node is likely to bridge two frontiers,
 * making it a strong candidate for path completion.
 *
 * @param graph - Source graph
 * @param nodeId - Node being evaluated
 * @param context - Current priority context
 * @returns Number of neighbours visited by other frontiers
 */
export function countCrossFrontierNeighbours<
	N extends NodeData,
	E extends EdgeData,
>(
	graph: ReadableGraph<N, E>,
	nodeId: NodeId,
	context: PriorityContext<N, E>,
): number {
	const { frontierIndex, visitedByFrontier } = context;
	const nodeNeighbours = new Set(graph.neighbours(nodeId));

	let count = 0;
	for (const [visitedId, idx] of visitedByFrontier) {
		if (idx !== frontierIndex && nodeNeighbours.has(visitedId)) {
			count++;
		}
	}

	return count;
}

/**
 * Incrementally update salience counts for paths discovered since the
 * last update.
 *
 * Iterates only over paths from `fromIndex` onwards, avoiding redundant
 * re-processing of already-counted paths.
 *
 * @param salienceCounts - Mutable map of node ID to salience count (mutated in place)
 * @param paths - Full list of discovered paths
 * @param fromIndex - Index to start counting from (exclusive of earlier paths)
 * @returns The new `fromIndex` value (i.e. `paths.length` after update)
 */
export function updateSalienceCounts(
	salienceCounts: Map<NodeId, number>,
	paths: readonly ExplorationPath[],
	fromIndex: number,
): number {
	for (let i = fromIndex; i < paths.length; i++) {
		const path = paths[i];
		if (path !== undefined) {
			for (const node of path.nodes) {
				salienceCounts.set(node, (salienceCounts.get(node) ?? 0) + 1);
			}
		}
	}
	return paths.length;
}
