/**
 * EDGE (Entropy-Driven Graph Exploration) algorithm.
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
import type { AsyncReadableGraph } from "../graph/async-interfaces";
import type { Seed, ExplorationResult, ExplorationConfig } from "./types";
import type { AsyncExpansionConfig } from "./base";
import { hae, haeAsync } from "./hae";

/** Default type mapper: reads `node.type`, falling back to "default". */
const defaultTypeMapper = (n: NodeData): string =>
	typeof n.type === "string" ? n.type : "default";

/**
 * Run EDGE exploration (Entropy-Driven Graph Exploration).
 *
 * Discovers paths by prioritising nodes with diverse neighbour types,
 * deferring nodes with homogeneous neighbourhoods.
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for exploration
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function edge<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: ExplorationConfig<N, E>,
): ExplorationResult {
	return hae(graph, seeds, {
		...config,
		typeMapper: defaultTypeMapper,
	});
}

/**
 * Run EDGE exploration asynchronously.
 *
 * Delegates to `haeAsync` with the default `node.type` mapper.
 *
 * Note: the HAE priority function accesses `context.graph` to retrieve
 * neighbour types. Full async equivalence requires PriorityContext
 * refactoring (Phase 4b deferred). This export establishes the async API
 * surface; use with a `wrapAsync`-wrapped sync graph for testing.
 *
 * @param graph - Async source graph
 * @param seeds - Seed nodes for exploration
 * @param config - Expansion and async runner configuration
 * @returns Promise resolving to the exploration result
 */
export async function edgeAsync<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: AsyncExpansionConfig<N, E>,
): Promise<ExplorationResult> {
	return haeAsync(graph, seeds, {
		...config,
		typeMapper: defaultTypeMapper,
	});
}
