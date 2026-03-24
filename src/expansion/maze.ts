/**
 * MAZE (Multi-Algorithm Zone Exploration) algorithm.
 *
 * Switches between different expansion strategies based on
 * local graph density and progress.
 *
 * Strategies:
 * - Sparse regions: DOME (expand hubs)
 * - Dense regions: EDGE (expand through low-degree edges)
 * - Bridge nodes: PIPE (expand bridges)
 *
 * @module expansion/maze
 */

import type { NodeData, EdgeData, ReadableGraph } from "../graph";
import type {
	Seed,
	ExpansionResult,
	ExpansionConfig,
	PriorityContext,
} from "./types";
import { base } from "./base";

/**
 * Configuration for MAZE expansion.
 */
export interface MAZEConfig<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> extends ExpansionConfig<N, E> {
	/** Density threshold for switching to EDGE mode (default: 0.5) */
	readonly densityThreshold?: number;
	/** Bridge threshold for switching to PIPE mode (default: 0.3) */
	readonly bridgeThreshold?: number;
}

/**
 * Compute local density around a node.
 */
function localDensity<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	nodeId: string,
): number {
	const neighbours = Array.from(graph.neighbours(nodeId));
	const degree = neighbours.length;

	if (degree < 2) {
		return 0;
	}

	// Count edges among neighbours
	let edges = 0;
	for (let i = 0; i < neighbours.length; i++) {
		for (let j = i + 1; j < neighbours.length; j++) {
			const ni = neighbours[i];
			const nj = neighbours[j];
			if (
				ni !== undefined &&
				nj !== undefined &&
				graph.getEdge(ni, nj) !== undefined
			) {
				edges++;
			}
		}
	}

	const maxEdges = (degree * (degree - 1)) / 2;
	return edges / maxEdges;
}

/**
 * Compute bridge score (how many other frontiers visit neighbours).
 */
function bridgeScore<N extends NodeData, E extends EdgeData>(
	nodeId: string,
	context: PriorityContext<N, E>,
): number {
	const currentFrontier = context.frontierIndex;
	const nodeNeighbours = new Set(context.graph.neighbours(nodeId));

	let score = 0;
	for (const [visitedId, idx] of context.visitedByFrontier) {
		if (idx !== currentFrontier && nodeNeighbours.has(visitedId)) {
			score++;
		}
	}

	return score;
}

/**
 * MAZE adaptive priority function.
 *
 * Switches strategies based on local conditions:
 * - High density + low bridge: EDGE mode
 * - Low density + low bridge: DOME mode
 * - High bridge score: PIPE mode
 */
function mazePriority<N extends NodeData, E extends EdgeData>(
	nodeId: string,
	context: PriorityContext<N, E>,
	densityThreshold: number,
	bridgeThreshold: number,
): number {
	const graph = context.graph;
	const degree = context.degree;

	// Compute local metrics
	const density = localDensity(graph, nodeId);
	const bridge = bridgeScore(nodeId, context);

	// Normalise bridge score by number of frontiers
	const numFrontiers = new Set(context.visitedByFrontier.values()).size;
	const normalisedBridge = numFrontiers > 0 ? bridge / numFrontiers : 0;

	// Select strategy
	if (normalisedBridge >= bridgeThreshold) {
		// PIPE mode: prioritise bridges
		return 1 / (1 + bridge);
	} else if (density >= densityThreshold) {
		// EDGE mode: avoid dense regions, expand through sparse edges
		return -degree; // Negative to prioritise low degree
	} else {
		// DOME mode: expand hubs first
		return degree;
	}
}

/**
 * Run MAZE expansion algorithm.
 *
 * Adaptively switches between expansion strategies based on
 * local graph structure. Useful for heterogeneous graphs
 * with varying density.
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function maze<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: MAZEConfig<N, E>,
): ExpansionResult {
	const {
		densityThreshold = 0.5,
		bridgeThreshold = 0.3,
		...restConfig
	} = config ?? {};

	const priority = (nodeId: string, context: PriorityContext<N, E>): number =>
		mazePriority(nodeId, context, densityThreshold, bridgeThreshold);

	return base(graph, seeds, {
		...restConfig,
		priority,
	});
}
