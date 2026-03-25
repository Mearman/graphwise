/**
 * Expansion algorithm types.
 *
 * These types define the contracts for bidirectional expansion algorithms
 * that discover paths between seed nodes.
 */

import type { ComputeBackend } from "../gpu/types";
import type { GraphwiseGPURoot } from "../gpu/root";
import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../graph";

/**
 * Role of a seed node in expansion.
 */
export type SeedRole = "source" | "target" | "bidirectional";

/**
 * A seed node for expansion.
 */
export interface Seed {
	/** Node identifier */
	readonly id: NodeId;
	/** Optional role - default is 'bidirectional' */
	readonly role?: SeedRole;
}

/**
 * Context provided to priority functions.
 */
export interface PriorityContext<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> {
	/** The source graph */
	readonly graph: ReadableGraph<N, E>;
	/** Degree of the node being prioritised */
	readonly degree: number;
	/** Index of the frontier this node belongs to */
	readonly frontierIndex: number;
	/** Map of node ID to frontier index that visited it */
	readonly visitedByFrontier: ReadonlyMap<NodeId, number>;
	/** Set of all visited nodes */
	readonly allVisited: ReadonlySet<NodeId>;
	/** Paths discovered so far */
	readonly discoveredPaths: readonly ExpansionPath[];
	/** Current iteration number */
	readonly iteration: number;
	/** Optional MI score (for REACH phase 2) */
	readonly mi?: number;
}

/**
 * Function that computes expansion priority for a node.
 * Lower values = higher priority (expanded first).
 */
export type PriorityFunction<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> = (nodeId: NodeId, context: PriorityContext<N, E>) => number;

/**
 * Context provided to batch priority functions for batch processing.
 */
export interface BatchPriorityContext<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> {
	/** The source graph */
	readonly graph: ReadableGraph<N, E>;
	/** Set of all visited nodes */
	readonly visited: ReadonlySet<NodeId>;
	/** Frontier ID for the current batch */
	readonly frontierId: number;
	/** Optional GPU backend selection */
	readonly backend?: ComputeBackend;
	/** Optional TypeGPU root for GPU acceleration */
	readonly root?: GraphwiseGPURoot;
}

/**
 * Function that computes priorities for multiple nodes at once.
 * Returns a Map of node ID to priority (lower values = higher priority).
 */
export type BatchPriorityFunction<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> = (
	candidates: readonly NodeId[],
	context: BatchPriorityContext<N, E>,
) => ReadonlyMap<NodeId, number>;

/**
 * A path discovered by bidirectional expansion.
 */
export interface ExpansionPath {
	/** Source seed */
	readonly fromSeed: Seed;
	/** Target seed */
	readonly toSeed: Seed;
	/** Nodes in the path (inclusive of endpoints) */
	readonly nodes: readonly NodeId[];
	/** Optional salience score */
	readonly salience?: number;
}

/**
 * Statistics from expansion.
 */
export interface ExpansionStats {
	/** Total iterations */
	readonly iterations: number;
	/** Total nodes visited */
	readonly nodesVisited: number;
	/** Total edges traversed */
	readonly edgesTraversed: number;
	/** Paths discovered */
	readonly pathsFound: number;
	/** Expansion duration in milliseconds */
	readonly durationMs: number;
	/** Algorithm name */
	readonly algorithm: string;
	/** Termination reason */
	readonly termination: "exhausted" | "limit" | "collision" | "error";
}

/**
 * Result of an expansion algorithm.
 */
export interface ExpansionResult {
	/** All discovered paths */
	readonly paths: readonly ExpansionPath[];
	/** Nodes sampled during expansion */
	readonly sampledNodes: ReadonlySet<NodeId>;
	/** Edges sampled during expansion */
	readonly sampledEdges: ReadonlySet<readonly [NodeId, NodeId]>;
	/** Nodes visited per frontier */
	readonly visitedPerFrontier: readonly ReadonlySet<NodeId>[];
	/** Expansion statistics */
	readonly stats: ExpansionStats;
}

/**
 * Configuration for expansion algorithms.
 */
export interface ExpansionConfig<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> {
	/** Maximum number of nodes to visit (0 = unlimited) */
	readonly maxNodes?: number;
	/** Maximum number of iterations (0 = unlimited) */
	readonly maxIterations?: number;
	/** Maximum paths to discover before stopping (0 = unlimited) */
	readonly maxPaths?: number;
	/** Custom priority function */
	readonly priority?: PriorityFunction<N, E>;
	/** Custom batch priority function for batch processing */
	readonly batchPriority?: BatchPriorityFunction<N, E>;
	/** Batch priority function for GPU acceleration */
	readonly batchPriorityGPU?: BatchPriorityFunction<N, E>;
	/** Random seed for reproducibility */
	readonly seed?: number;
	/** Enable debug logging */
	readonly debug?: boolean;
}
