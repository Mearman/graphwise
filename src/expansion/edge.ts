/**
 * EDGE (Entropy-Driven Graph Expansion) algorithm.
 *
 * Discovers paths by prioritising nodes with diverse neighbour types.
 * Priority function: π(v) = (1 / (H_local(v) + ε)) × log(deg(v) + 1)
 *
 * where H_local(v) = Shannon entropy of the neighbour type distribution.
 *
 * High entropy (diverse types) → lower priority → expanded sooner.
 * Low entropy (homogeneous types) → higher priority → deferred.
 */

import type { NodeData, EdgeData, ReadableGraph } from "../graph";
import type {
	Seed,
	ExpansionResult,
	ExpansionConfig,
	PriorityContext,
} from "./types";
import { base } from "./base";
import { localTypeEntropy } from "../utils/entropy";

const EPSILON = 1e-10;

/**
 * Priority function using local type entropy.
 * Lower values = higher priority (expanded first).
 */
function edgePriority<N extends NodeData, E extends EdgeData>(
	nodeId: string,
	context: PriorityContext<N, E>,
): number {
	const graph = context.graph;
	const neighbours = graph.neighbours(nodeId);

	// Collect neighbour types
	const neighbourTypes: string[] = [];
	for (const neighbour of neighbours) {
		const node = graph.getNode(neighbour);
		neighbourTypes.push(node?.type ?? "default");
	}

	// Compute local type entropy (normalised Shannon entropy)
	const entropy = localTypeEntropy(neighbourTypes);

	// Priority = 1 / (entropy + ε) * log(degree + 1)
	// High entropy (diverse types) → lower priority (expanded sooner)
	return (1 / (entropy + EPSILON)) * Math.log(context.degree + 1);
}

/**
 * Run EDGE expansion (Entropy-Driven Graph Expansion).
 *
 * Discovers paths by prioritising nodes with diverse neighbour types,
 * deferring nodes with homogeneous neighbourhoods.
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function edge<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: ExpansionConfig<N, E>,
): ExpansionResult {
	return base(graph, seeds, {
		...config,
		priority: edgePriority,
	});
}
