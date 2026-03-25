/**
 * Mutual Information (MI) function types for path ranking.
 *
 * MI measures quantify the strength of association between connected nodes.
 * These are used in PARSE for path salience computation.
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../../graph";

/**
 * MI function computes association strength between connected nodes.
 *
 * @param graph - Source graph
 * @param source - Source node ID
 * @param target - Target node ID
 * @returns MI score in [0, 1] range (0 = no association, 1 = perfect)
 */
export type MIFunction<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> = (graph: ReadableGraph<N, E>, source: NodeId, target: NodeId) => number;

/**
 * Names of available MI variants.
 */
export type MIVariantName =
	| "jaccard"
	| "adamic-adar"
	| "cosine"
	| "sorensen"
	| "resource-allocation"
	| "overlap-coefficient"
	| "hub-promoted"
	| "scale"
	| "skew"
	| "span"
	| "etch"
	| "notch"
	| "adaptive";

/**
 * Configuration for MI computation.
 */
export interface MIConfig {
	/** Epsilon for numerical stability */
	readonly epsilon?: number;
	/** Whether to normalise result to [0, 1] */
	readonly normalise?: boolean;
}

/**
 * Configuration for Adaptive MI.
 */
export interface AdaptiveMIConfig extends MIConfig {
	/** Weight for structural (Jaccard) MI component */
	readonly structuralWeight?: number;
	/** Weight for degree-weighted (Adamic-Adar) MI component */
	readonly degreeWeight?: number;
	/** Weight for overlap coefficient component */
	readonly overlapWeight?: number;
}
