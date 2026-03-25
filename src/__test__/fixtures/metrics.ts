/**
 * Comparison metrics for expansion and ranking algorithm evaluation.
 *
 * Pure functions for measuring hub deferral, path diversity, subgraph density,
 * coverage efficiency, and statistical correlation between rankings.
 *
 * These are intended for use in integration tests and experiment scripts where
 * algorithms must be compared quantitatively.
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { ExpansionResult } from "../../expansion/types";
import type { PARSEResult } from "../../ranking/parse";

// ---------------------------------------------------------------------------
// Expansion metrics
// ---------------------------------------------------------------------------

/**
 * Fraction of visited nodes whose degree is below the 90th percentile of all
 * sampled node degrees. A high ratio indicates the algorithm successfully
 * defers high-degree hubs in favour of lower-degree nodes.
 */
export function hubDeferralRatio<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	result: ExpansionResult,
): number {
	const nodes = Array.from(result.sampledNodes);
	if (nodes.length === 0) {
		return 0;
	}

	const degrees = nodes.map((id) => graph.degree(id, "both"));
	const sorted = [...degrees].sort((a, b) => a - b);
	const idx = Math.floor(sorted.length * 0.9);
	const threshold = sorted[Math.min(idx, sorted.length - 1)] ?? 0;

	const belowThreshold = degrees.filter((d) => d < threshold).length;
	return belowThreshold / degrees.length;
}

/**
 * Count of distinct intermediate nodes (i.e. excluding endpoints) across all
 * discovered paths. Higher values indicate broader path diversity.
 */
export function pathDiversity(result: ExpansionResult): number {
	const intermediates = new Set<NodeId>();
	for (const path of result.paths) {
		const nodes = path.nodes;
		// Exclude first and last (endpoints)
		for (let i = 1; i < nodes.length - 1; i++) {
			const node = nodes[i];
			if (node !== undefined) {
				intermediates.add(node);
			}
		}
	}
	return intermediates.size;
}

/**
 * Ratio of sampled edges to sampled nodes. Reflects how densely the sampled
 * subgraph is connected (higher = more edges per node).
 */
export function subgraphDensity(result: ExpansionResult): number {
	const nodeCount = result.sampledNodes.size;
	if (nodeCount === 0) {
		return 0;
	}
	return result.sampledEdges.size / nodeCount;
}

/**
 * Ratio of discovered paths to total nodes visited. Measures how efficiently
 * the expansion produced useful paths relative to exploration cost.
 */
export function coverageEfficiency(result: ExpansionResult): number {
	const nodesVisited = result.stats.nodesVisited;
	if (nodesVisited === 0) {
		return 0;
	}
	return result.paths.length / nodesVisited;
}

/**
 * Ratio of total iterations to paths discovered. Measures how many
 * iterations were required per path. Returns Infinity when no paths
 * were found (expansion terminated without connecting seeds).
 */
export function firstPathLatency(result: ExpansionResult): number {
	if (result.paths.length === 0) {
		return Infinity;
	}
	return result.stats.iterations / result.paths.length;
}

/**
 * Number of distinct node types present in the sampled node set.
 * Nodes without a `type` property are counted as a single unnamed type.
 */
export function typeCoverage<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	result: ExpansionResult,
): number {
	const types = new Set<string>();
	for (const nodeId of result.sampledNodes) {
		const node = graph.getNode(nodeId);
		if (node !== undefined) {
			types.add(node.type ?? "__untyped__");
		}
	}
	return types.size;
}

/**
 * Number of connected components that contain at least one path node,
 * determined via union-find over the sampled edge set. Higher values
 * indicate paths spanning structurally distant regions of the graph.
 */
export function communitySpan(result: ExpansionResult): number {
	// Build union-find over sampled edges
	const parent = new Map<NodeId, NodeId>();

	function find(id: NodeId): NodeId {
		if (!parent.has(id)) {
			parent.set(id, id);
		}
		const p = parent.get(id) ?? id;
		if (p !== id) {
			const root = find(p);
			parent.set(id, root);
			return root;
		}
		return p;
	}

	function union(a: NodeId, b: NodeId): void {
		const ra = find(a);
		const rb = find(b);
		if (ra !== rb) {
			parent.set(ra, rb);
		}
	}

	// Initialise all sampled nodes
	for (const nodeId of result.sampledNodes) {
		find(nodeId);
	}

	// Union connected nodes via sampled edges
	for (const [src, tgt] of result.sampledEdges) {
		union(src, tgt);
	}

	// Collect roots of nodes that appear in at least one path
	const pathNodeRoots = new Set<NodeId>();
	for (const path of result.paths) {
		for (const nodeId of path.nodes) {
			pathNodeRoots.add(find(nodeId));
		}
	}

	return pathNodeRoots.size;
}

// ---------------------------------------------------------------------------
// Ranking correlation metrics
// ---------------------------------------------------------------------------

/**
 * Spearman rank correlation coefficient between two rankings (arrays of node
 * IDs ordered from highest to lowest). Returns a value in [-1, 1] where 1
 * means identical order and -1 means perfectly reversed.
 *
 * Only nodes present in both rankings are considered.
 */
export function spearmanRho(
	rankingA: readonly NodeId[],
	rankingB: readonly NodeId[],
): number {
	// Collect nodes present in both rankings, preserving their relative order
	const setB = new Set(rankingB);
	const commonByA = rankingA.filter((id) => setB.has(id));
	const setA = new Set(rankingA);
	const commonByB = rankingB.filter((id) => setA.has(id));

	const n = commonByA.length;
	if (n === 0) {
		return 0;
	}

	// Assign contiguous ranks 1..n based on each ranking's relative order
	const rankInA = new Map<NodeId, number>();
	const rankInB = new Map<NodeId, number>();
	commonByA.forEach((id, i) => rankInA.set(id, i + 1));
	commonByB.forEach((id, i) => rankInB.set(id, i + 1));

	let sumD2 = 0;
	for (const id of commonByA) {
		const ra = rankInA.get(id) ?? 0;
		const rb = rankInB.get(id) ?? 0;
		const d = ra - rb;
		sumD2 += d * d;
	}

	if (n < 2) {
		return 1;
	}

	return 1 - (6 * sumD2) / (n * (n * n - 1));
}

/**
 * Kendall tau rank correlation coefficient between two rankings. Returns a
 * value in [-1, 1] where 1 means identical and -1 means fully reversed.
 *
 * Only nodes present in both rankings are considered.
 */
export function kendallTau(
	rankingA: readonly NodeId[],
	rankingB: readonly NodeId[],
): number {
	const posA = new Map<NodeId, number>();
	const posB = new Map<NodeId, number>();

	rankingA.forEach((id, i) => posA.set(id, i));
	rankingB.forEach((id, i) => posB.set(id, i));

	const common: NodeId[] = [];
	for (const id of posA.keys()) {
		if (posB.has(id)) {
			common.push(id);
		}
	}

	const n = common.length;
	if (n < 2) {
		return n === 0 ? 0 : 1;
	}

	let concordant = 0;
	let discordant = 0;

	for (let i = 0; i < n; i++) {
		for (let j = i + 1; j < n; j++) {
			const idI = common[i] ?? "";
			const idJ = common[j] ?? "";
			const signA = Math.sign((posA.get(idI) ?? 0) - (posA.get(idJ) ?? 0));
			const signB = Math.sign((posB.get(idI) ?? 0) - (posB.get(idJ) ?? 0));
			if (signA === signB) {
				concordant++;
			} else {
				discordant++;
			}
		}
	}

	const pairs = (n * (n - 1)) / 2;
	return (concordant - discordant) / pairs;
}

// ---------------------------------------------------------------------------
// Ranking quality metrics
// ---------------------------------------------------------------------------

/**
 * Ratio of weak-link path salience to consistent-path salience. Values below
 * 1 indicate the consistent path scores higher (expected behaviour); values
 * above 1 indicate the weak-link path is incorrectly ranked higher.
 *
 * @param consistent - Mean salience of paths expected to rank highest
 * @param weakLink   - Mean salience of paths expected to rank lower
 */
export function weakLinkSensitivity(
	consistent: number,
	weakLink: number,
): number {
	if (consistent === 0) {
		return weakLink === 0 ? 1 : Infinity;
	}
	return weakLink / consistent;
}

/**
 * Sample variance of salience scores across all ranked paths. Returns 0 when
 * all paths have identical scores (no discriminative power).
 */
export function scoreVariance(parseResult: PARSEResult): number {
	const scores = parseResult.paths.map((p) => p.salience);
	const n = scores.length;
	if (n < 2) {
		return 0;
	}
	const mean = scores.reduce((acc, s) => acc + s, 0) / n;
	const sumSq = scores.reduce((acc, s) => acc + (s - mean) ** 2, 0);
	return sumSq / (n - 1);
}

/**
 * Pearson correlation between path length (number of edges) and salience
 * score. Values near 0 indicate length-unbiased ranking; strong positive or
 * negative values indicate length bias.
 */
export function lengthBias(parseResult: PARSEResult): number {
	const paths = parseResult.paths;
	const n = paths.length;
	if (n < 2) {
		return 0;
	}

	const lengths = paths.map((p) => Math.max(0, p.nodes.length - 1));
	const saliences = paths.map((p) => p.salience);

	const meanLen = lengths.reduce((a, b) => a + b, 0) / n;
	const meanSal = saliences.reduce((a, b) => a + b, 0) / n;

	let covLS = 0;
	let varL = 0;
	let varS = 0;

	for (let i = 0; i < n; i++) {
		const dl = (lengths[i] ?? 0) - meanLen;
		const ds = (saliences[i] ?? 0) - meanSal;
		covLS += dl * ds;
		varL += dl * dl;
		varS += ds * ds;
	}

	const denom = Math.sqrt(varL * varS);
	if (denom === 0) {
		return 0;
	}

	return covLS / denom;
}

/**
 * Ratio of hub path salience to peripheral path salience. Values below 1
 * indicate hub paths score lower (hub penalty is working); values at or above
 * 1 indicate no penalty.
 *
 * @param peripheral - Mean salience of paths through low-degree nodes
 * @param hub        - Mean salience of paths through high-degree hub nodes
 */
export function hubPenaltyStrength(peripheral: number, hub: number): number {
	if (peripheral === 0) {
		return hub === 0 ? 1 : Infinity;
	}
	return hub / peripheral;
}
