/**
 * Mutual Information (MI) variants module.
 *
 * MI measures quantify the strength of association between connected nodes.
 * These are used in PARSE for computing path salience via geometric mean.
 *
 * @module ranking/mi
 */

// Types
export type {
	MIFunction,
	MIVariantName,
	MIConfig,
	AdaptiveMIConfig,
} from "./types";

// Jaccard similarity
export { jaccard } from "./jaccard";

// Adamic-Adar index
export { adamicAdar } from "./adamic-adar";

// SCALE (Structural Coherence via Adjacency Lattice Entropy)
export { scale } from "./scale";

// SKEW (Structural Kernel Entropy Weighting)
export { skew } from "./skew";

// SPAN (Structural Pattern ANalysis)
export { span } from "./span";

// ETCH (Edge Topology Coherence via Homophily)
export { etch } from "./etch";

// NOTCH (Neighbourhood Overlap Topology Coherence via Homophily)
export { notch } from "./notch";

// Unified Adaptive MI
export { adaptive } from "./adaptive";
