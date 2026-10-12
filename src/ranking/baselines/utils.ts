/**
 * Shared utilities for baseline ranking methods.
 *
 * @packageDocumentation
 */

import type { ExplorationPath } from "../../exploration/types";
import type { EdgeData, NodeData, ReadableGraph } from "../../graph";
import type { BaselineResult, ScoredPath } from "./types";

/**
 * Normalise a set of scored paths and return them sorted highest-first.
 *
 * All scores are normalised relative to the maximum observed score.
 * When `includeScores` is false, raw (un-normalised) scores are preserved.
 * Handles degenerate cases: empty input and all-zero scores.
 *
 * @param paths - Original paths in input order
 * @param scored - Paths paired with their computed scores
 * @param method - Method name to embed in the result
 * @param includeScores - When true, normalise scores to [0, 1]; when false, keep raw scores
 * @returns BaselineResult with ranked paths
 */
export function normaliseAndRank(
	paths: readonly ExplorationPath[],
	scored: readonly { readonly path: ExplorationPath; readonly score: number }[],
	method: string,
	includeScores: boolean,
): BaselineResult {
	if (scored.length === 0) {
		return { paths: [], method };
	}

	const maxScore = Math.max(...scored.map((s) => s.score));

	// Handle zero-max case: all paths get score 0
	if (maxScore === 0) {
		return {
			paths: paths.map((path) => ({ ...path, score: 0 })),
			method,
		};
	}

	const ranked: ScoredPath[] = scored
		.map(({ path, score }) => ({
			...path,
			score: includeScores ? score / maxScore : score,
		}))
		.sort((a, b) => b.score - a.score);

	return { paths: ranked, method };
}

/**
 * A graph read once into index form: node order, id-to-index lookup and out-neighbour index lists. Walk-based baselines build this once per ranking call, so the cost of reading the graph does not grow with the number of paths.
 */
export interface IndexedAdjacency {
	readonly nodes: readonly string[];
	readonly index: ReadonlyMap<string, number>;
	readonly neighbours: readonly (readonly number[])[];
}

export function indexAdjacency<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
): IndexedAdjacency {
	const nodes = Array.from(graph.nodeIds());
	const index = new Map<string, number>();
	nodes.forEach((id, i) => {
		index.set(id, i);
	});
	const neighbours = nodes.map((id) => {
		const out: number[] = [];
		for (const neighbourId of graph.neighbours(id)) {
			const j = index.get(neighbourId);
			if (j !== undefined) out.push(j);
		}
		return out;
	});
	return { nodes, index, neighbours };
}

/**
 * The series sum over d of coefficients[d] * (A^d e_anchor), as a vector over all nodes: entry i weights the walks of each length from i to the anchor. Coefficient 0 weights the identity term.
 */
export function walkSeriesToAnchor(
	adjacency: IndexedAdjacency,
	anchor: number,
	coefficients: readonly number[],
): Float64Array {
	const n = adjacency.nodes.length;
	let walks = new Float64Array(n);
	walks[anchor] = 1;
	const scores = new Float64Array(n);
	const identityWeight = coefficients[0] ?? 0;
	scores[anchor] = identityWeight;
	for (let depth = 1; depth < coefficients.length; depth++) {
		const next = new Float64Array(n);
		for (let i = 0; i < n; i++) {
			let total = 0;
			for (const j of adjacency.neighbours[i] ?? []) total += walks[j] ?? 0;
			next[i] = total;
		}
		const weight = coefficients[depth] ?? 0;
		for (let i = 0; i < n; i++)
			scores[i] = (scores[i] ?? 0) + weight * (next[i] ?? 0);
		walks = next;
	}
	return scores;
}

/**
 * Scores every path by a walk series between its endpoints, running the series once per distinct anchor endpoint instead of once per path. On an undirected graph walk counts are symmetric in the endpoints, so the endpoint with fewer distinct values anchors (paths from a few seeds to many candidates then cost a few propagations); on a directed graph the target anchors.
 */
export function scorePathsByWalkSeries<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	paths: readonly ExplorationPath[],
	coefficients: readonly number[],
): readonly { readonly path: ExplorationPath; readonly score: number }[] {
	const adjacency = indexAdjacency(graph);
	const endpoints = paths.map((path) => ({
		path,
		source: path.nodes[0],
		target: path.nodes[path.nodes.length - 1],
	}));
	const distinct = (
		pick: (e: (typeof endpoints)[number]) => string | undefined,
	): number => new Set(endpoints.map(pick)).size;
	const anchorIsSource =
		!graph.directed && distinct((e) => e.source) < distinct((e) => e.target);
	const series = new Map<number, Float64Array>();
	return endpoints.map(({ path, source, target }) => {
		const anchorId = anchorIsSource ? source : target;
		const otherId = anchorIsSource ? target : source;
		if (anchorId === undefined || otherId === undefined)
			return { path, score: 0 };
		const anchor = adjacency.index.get(anchorId);
		const other = adjacency.index.get(otherId);
		if (anchor === undefined || other === undefined) return { path, score: 0 };
		let vector = series.get(anchor);
		if (vector === undefined) {
			vector = walkSeriesToAnchor(adjacency, anchor, coefficients);
			series.set(anchor, vector);
		}
		return { path, score: vector[other] ?? 0 };
	});
}
