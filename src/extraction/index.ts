/**
 * Subgraph extraction algorithms module.
 *
 * Provides algorithms for extracting various subgraphs from a graph:
 * - Ego-networks (k-hop neighbourhoods)
 * - K-core decomposition
 * - K-truss decomposition
 * - Motif enumeration
 * - Induced subgraphs
 * - Filtered subgraphs
 *
 * @module extraction
 */

export { extractEgoNetwork, type EgoNetworkOptions } from "./ego-network";
export { extractKCore } from "./k-core";
export { extractKTruss } from "./truss";
export {
	enumerateMotifs,
	enumerateMotifsWithInstances,
	getMotifName,
	type MotifCensus,
} from "./motif";
export { extractInducedSubgraph } from "./induced-subgraph";
export { filterSubgraph, type FilterOptions } from "./node-filter";
