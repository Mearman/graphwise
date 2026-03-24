/**
 * HAE (Heterogeneity-Aware Expansion) algorithm.
 *
 * Generalises EDGE with user-supplied type mapper for flexible type extraction.
 * Priority function: π(v) = (1 / (H_local(v) + ε)) × log(deg(v) + 1)
 *
 * where H_local(v) = Shannon entropy of the neighbour type distribution
 * computed using the provided typeMapper function.
 *
 * Allows custom type extraction beyond node.type.
 * Degenerates to DOME on homogeneous graphs (all types the same).
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
 * Configuration for HAE, extending base ExpansionConfig.
 */
export interface HAEConfig<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> extends ExpansionConfig<N, E> {
	/** Function to extract type from a node (default: node.type) */
	readonly typeMapper?: (node: N) => string;
}

/**
 * Default type mapper - uses node.type property.
 */
function defaultTypeMapper(node: NodeData): string {
	return node.type ?? "default";
}

/**
 * Create a priority function using the given type mapper.
 */
function createHAEPriority<N extends NodeData, E extends EdgeData>(
	typeMapper: (node: N) => string,
) {
	return function haePriority(
		nodeId: string,
		context: PriorityContext<N, E>,
	): number {
		const graph = context.graph;
		const neighbours = graph.neighbours(nodeId);

		// Collect neighbour types using the custom mapper
		const neighbourTypes: string[] = [];
		for (const neighbour of neighbours) {
			const node = graph.getNode(neighbour);
			if (node !== undefined) {
				neighbourTypes.push(typeMapper(node));
			}
		}

		// Compute local type entropy
		const entropy = localTypeEntropy(neighbourTypes);

		// Priority = 1 / (entropy + ε) * log(degree + 1)
		return (1 / (entropy + EPSILON)) * Math.log(context.degree + 1);
	};
}

/**
 * Run HAE expansion (Heterogeneity-Aware Expansion).
 *
 * Discovers paths by prioritising nodes with diverse neighbour types,
 * using a custom type mapper for flexible type extraction.
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for expansion
 * @param config - HAE configuration with optional typeMapper
 * @returns Expansion result with discovered paths
 */
export function hae<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: HAEConfig<N, E>,
): ExpansionResult {
	const typeMapper = config?.typeMapper ?? defaultTypeMapper;

	return base(graph, seeds, {
		...config,
		priority: createHAEPriority<N, E>(typeMapper),
	});
}
