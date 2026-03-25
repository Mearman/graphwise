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
 *
 * Delegates to HAE with the default `node.type` mapper.
 */

import type { NodeData, EdgeData, ReadableGraph } from "../graph";
import type { Seed, ExpansionResult, ExpansionConfig } from "./types";
import { hae } from "./hae";

/** Default type mapper: reads `node.type`, falling back to "default". */
const defaultTypeMapper = (n: NodeData): string =>
	typeof n.type === "string" ? n.type : "default";

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
	return hae(graph, seeds, {
		...config,
		typeMapper: defaultTypeMapper,
	});
}
