/**
 * Betweenness baseline ranking.
 *
 * Computes betweenness centrality using Brandes algorithm O(|V||E|).
 * Score = sum(betweenness(v) for v in path), normalised to [0, 1].
 */

import type { NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { ExpansionPath } from "../../expansion/types";
import type { BaselineConfig, BaselineResult } from "./types";
import { normaliseAndRank } from "./utils";

/**
 * Compute betweenness centrality for all nodes using Brandes algorithm.
 *
 * @param graph - Source graph
 * @returns Map of node ID to betweenness value
 */
function computeBetweenness<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
): Map<string, number> {
	const nodes = Array.from(graph.nodeIds());
	const betweenness = new Map<string, number>();

	// Initialise all betweenness to 0
	for (const nodeId of nodes) {
		betweenness.set(nodeId, 0);
	}

	// For each node as source
	for (const source of nodes) {
		// BFS to find shortest paths
		const predecessors = new Map<string, string[]>();
		const distance = new Map<string, number>();
		const sigma = new Map<string, number>();
		const queue: string[] = [];

		// Initialise
		for (const nodeId of nodes) {
			predecessors.set(nodeId, []);
			distance.set(nodeId, -1);
			sigma.set(nodeId, 0);
		}

		distance.set(source, 0);
		sigma.set(source, 1);
		queue.push(source);

		// BFS
		for (const v of queue) {
			const vDist = distance.get(v) ?? -1;
			const neighbours = graph.neighbours(v);

			for (const w of neighbours) {
				const wDist = distance.get(w) ?? -1;

				// First time seeing w?
				if (wDist < 0) {
					distance.set(w, vDist + 1);
					queue.push(w);
				}

				// Shortest path to w through v?
				if (wDist === vDist + 1) {
					const wSigma = sigma.get(w) ?? 0;
					const vSigma = sigma.get(v) ?? 0;
					sigma.set(w, wSigma + vSigma);

					const wPred = predecessors.get(w) ?? [];
					wPred.push(v);
					predecessors.set(w, wPred);
				}
			}
		}

		// Accumulation
		const delta = new Map<string, number>();
		for (const nodeId of nodes) {
			delta.set(nodeId, 0);
		}

		// Process in reverse order of distance
		const sorted = [...nodes].sort((a, b) => {
			const aD = distance.get(a) ?? -1;
			const bD = distance.get(b) ?? -1;
			return bD - aD;
		});

		for (const w of sorted) {
			if (w === source) continue;

			const wDelta = delta.get(w) ?? 0;
			const wSigma = sigma.get(w) ?? 0;

			const wPred = predecessors.get(w) ?? [];
			for (const v of wPred) {
				const vSigma = sigma.get(v) ?? 0;
				const vDelta = delta.get(v) ?? 0;

				if (wSigma > 0) {
					delta.set(v, vDelta + (vSigma / wSigma) * (1 + wDelta));
				}
			}

			if (w !== source) {
				const current = betweenness.get(w) ?? 0;
				betweenness.set(w, current + wDelta);
			}
		}
	}

	return betweenness;
}

/**
 * Rank paths by sum of betweenness scores.
 *
 * @param graph - Source graph
 * @param paths - Paths to rank
 * @param config - Configuration options
 * @returns Ranked paths (highest betweenness sum first)
 */
export function betweenness<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	paths: readonly ExpansionPath[],
	config?: BaselineConfig,
): BaselineResult {
	const { includeScores = true } = config ?? {};

	if (paths.length === 0) {
		return {
			paths: [],
			method: "betweenness",
		};
	}

	// Compute betweenness
	const bcMap = computeBetweenness(graph);

	// Score paths by sum of betweenness
	const scored: { path: ExpansionPath; score: number }[] = paths.map((path) => {
		let bcSum = 0;
		for (const nodeId of path.nodes) {
			bcSum += bcMap.get(nodeId) ?? 0;
		}
		return { path, score: bcSum };
	});

	return normaliseAndRank(paths, scored, "betweenness", includeScores);
}
