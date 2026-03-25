/**
 * Graph operation protocol for generator-based algorithms.
 *
 * Algorithms yield GraphOp objects to request data from the graph.
 * Runners resolve these operations synchronously or asynchronously,
 * returning tagged GraphOpResponse objects for type-safe narrowing.
 *
 * @module async/protocol
 */

import type { NodeId, NodeData, EdgeData, Direction } from "../graph";

/** Operations the generator can yield to request graph data. */
export type GraphOp =
	| {
			readonly tag: "neighbours";
			readonly id: NodeId;
			readonly direction?: Direction;
	  }
	| {
			readonly tag: "degree";
			readonly id: NodeId;
			readonly direction?: Direction;
	  }
	| { readonly tag: "getNode"; readonly id: NodeId }
	| {
			readonly tag: "getEdge";
			readonly source: NodeId;
			readonly target: NodeId;
	  }
	| { readonly tag: "hasNode"; readonly id: NodeId }
	| { readonly tag: "yield" }
	| { readonly tag: "progress"; readonly stats: ProgressStats };

/**
 * Tagged response from a runner for a graph operation.
 *
 * Using a discriminated union with `tag` allows type-safe narrowing
 * without type assertions (satisfying strict lint rules).
 */
export type GraphOpResponse<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
> =
	| { readonly tag: "neighbours"; readonly value: readonly NodeId[] }
	| { readonly tag: "degree"; readonly value: number }
	| { readonly tag: "getNode"; readonly value: N | undefined }
	| { readonly tag: "getEdge"; readonly value: E | undefined }
	| { readonly tag: "hasNode"; readonly value: boolean }
	| { readonly tag: "yield" }
	| { readonly tag: "progress" };

/** Progress statistics emitted during expansion. */
export interface ProgressStats {
	readonly iterations: number;
	readonly nodesVisited: number;
	readonly edgesTraversed: number;
	readonly pathsFound: number;
	readonly frontierSizes: readonly number[];
	readonly elapsedMs: number;
}
