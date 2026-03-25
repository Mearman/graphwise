import type { NodeData, EdgeData, ReadableGraph } from "graphwise/graph";
import type {
	ExpansionResult,
	ExpansionConfig,
	Seed,
} from "graphwise/expansion";
import {
	base,
	dome,
	edge,
	hae,
	pipe,
	sage,
	reach,
	maze,
	tide,
	lace,
	warp,
	fuse,
	sift,
	flux,
	standardBfs,
	frontierBalanced,
	randomPriority,
	dfsPriority,
} from "graphwise/expansion";
import type { MIFunction, MIVariantName } from "graphwise/ranking/mi";
import {
	jaccard,
	adamicAdar,
	cosine,
	sorensen,
	resourceAllocation,
	overlapCoefficient,
	hubPromoted,
	scale,
	skew,
	span,
	etch,
	notch,
	adaptive,
} from "graphwise/ranking/mi";

export type ExpansionAlgorithmName =
	| "base"
	| "dome"
	| "edge"
	| "hae"
	| "pipe"
	| "sage"
	| "reach"
	| "maze"
	| "tide"
	| "lace"
	| "warp"
	| "fuse"
	| "sift"
	| "flux"
	| "standard-bfs"
	| "frontier-balanced"
	| "random-priority"
	| "dfs-priority";

type ExpansionFn = <N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: ExpansionConfig<N, E>,
) => ExpansionResult;

export interface AlgorithmInfo {
	readonly name: ExpansionAlgorithmName;
	readonly label: string;
	readonly description: string;
	readonly category: "novel" | "baseline";
	readonly run: ExpansionFn;
}

export interface MIVariantInfo {
	readonly name: MIVariantName;
	readonly label: string;
	readonly description: string;
	readonly fn: MIFunction;
}

const EXPANSION_ALGORITHMS: readonly AlgorithmInfo[] = [
	{
		name: "base",
		label: "BASE",
		description: "Base bidirectional expansion with configurable priority",
		category: "baseline",
		run: base,
	},
	{
		name: "dome",
		label: "DOME",
		description: "Degree-ordered multi-seed expansion — low-degree nodes first",
		category: "novel",
		run: dome,
	},
	{
		name: "edge",
		label: "EDGE",
		description: "Entropy-driven graph exploration using edge-type diversity",
		category: "novel",
		run: edge,
	},
	{
		name: "hae",
		label: "HAE",
		description: "Hub-aware exploration balancing hub and non-hub nodes",
		category: "novel",
		run: hae,
	},
	{
		name: "pipe",
		label: "PIPE",
		description: "Priority-informed path exploration",
		category: "novel",
		run: pipe,
	},
	{
		name: "sage",
		label: "SAGE",
		description: "Salience-aware graph exploration with MI feedback",
		category: "novel",
		run: sage,
	},
	{
		name: "reach",
		label: "REACH",
		description: "Relevance-estimated adaptive connectivity heuristics",
		category: "novel",
		run: reach,
	},
	{
		name: "maze",
		label: "MAZE",
		description: "Multi-zone adaptive zooming exploration",
		category: "novel",
		run: maze,
	},
	{
		name: "tide",
		label: "TIDE",
		description: "Topology-informed directed exploration",
		category: "novel",
		run: tide,
	},
	{
		name: "lace",
		label: "LACE",
		description: "Link-aware connectivity estimation",
		category: "novel",
		run: lace,
	},
	{
		name: "warp",
		label: "WARP",
		description: "Weighted adaptive random-path discovery",
		category: "novel",
		run: warp,
	},
	{
		name: "fuse",
		label: "FUSE",
		description: "Frontier-unified strategic exploration",
		category: "novel",
		run: fuse,
	},
	{
		name: "sift",
		label: "SIFT",
		description: "Salience-informed frontier traversal",
		category: "novel",
		run: sift,
	},
	{
		name: "flux",
		label: "FLUX",
		description: "Frontier-level uncertainty exploration",
		category: "novel",
		run: flux,
	},
	{
		name: "standard-bfs",
		label: "Standard BFS",
		description: "Standard breadth-first search baseline",
		category: "baseline",
		run: standardBfs,
	},
	{
		name: "frontier-balanced",
		label: "Frontier Balanced",
		description: "Balances expansion across frontiers",
		category: "baseline",
		run: frontierBalanced,
	},
	{
		name: "random-priority",
		label: "Random Priority",
		description: "Random node ordering baseline",
		category: "baseline",
		run: randomPriority,
	},
	{
		name: "dfs-priority",
		label: "DFS Priority",
		description: "Depth-first style prioritisation",
		category: "baseline",
		run: dfsPriority,
	},
];

const MI_VARIANTS: readonly MIVariantInfo[] = [
	{
		name: "jaccard",
		label: "Jaccard",
		description: "Jaccard coefficient of neighbour sets",
		fn: jaccard,
	},
	{
		name: "adamic-adar",
		label: "Adamic-Adar",
		description: "Adamic-Adar index weighting common neighbours",
		fn: adamicAdar,
	},
	{
		name: "cosine",
		label: "Cosine",
		description: "Cosine similarity of neighbour vectors",
		fn: cosine,
	},
	{
		name: "sorensen",
		label: "Sorensen",
		description: "Sørensen–Dice coefficient",
		fn: sorensen,
	},
	{
		name: "resource-allocation",
		label: "Resource Allocation",
		description: "Resource allocation index",
		fn: resourceAllocation,
	},
	{
		name: "overlap-coefficient",
		label: "Overlap Coefficient",
		description: "Overlap coefficient of neighbour sets",
		fn: overlapCoefficient,
	},
	{
		name: "hub-promoted",
		label: "Hub Promoted",
		description: "Hub-promoted index favouring hub connections",
		fn: hubPromoted,
	},
	{
		name: "scale",
		label: "SCALE",
		description: "Density-normalised Jaccard for sparse graphs",
		fn: scale,
	},
	{
		name: "skew",
		label: "SKEW",
		description: "Skew-corrected MI for asymmetric degrees",
		fn: skew,
	},
	{
		name: "span",
		label: "SPAN",
		description: "Clustering-aware edge weighting",
		fn: span,
	},
	{
		name: "etch",
		label: "ETCH",
		description: "Edge-type contrast heuristic",
		fn: etch,
	},
	{
		name: "notch",
		label: "NOTCH",
		description: "Node-type contrast heuristic",
		fn: notch,
	},
	{
		name: "adaptive",
		label: "Adaptive",
		description: "Adaptive combination of MI measures",
		fn: adaptive,
	},
];

export function getAlgorithm(
	name: ExpansionAlgorithmName,
): AlgorithmInfo | undefined {
	return EXPANSION_ALGORITHMS.find((a) => a.name === name);
}

export function getMIVariant(name: MIVariantName): MIVariantInfo | undefined {
	return MI_VARIANTS.find((v) => v.name === name);
}

export function expansionAlgorithmNames(): readonly ExpansionAlgorithmName[] {
	return EXPANSION_ALGORITHMS.map((a) => a.name);
}

export function miVariantNames(): readonly MIVariantName[] {
	return MI_VARIANTS.map((v) => v.name);
}
