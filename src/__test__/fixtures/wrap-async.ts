/**
 * Test helper: wraps a ReadableGraph as an AsyncReadableGraph.
 *
 * All methods delegate to the sync graph, wrapping returns in
 * Promise.resolve() or async generators. Used for verifying that
 * async runners produce identical results to sync runners.
 */

import type {
	NodeId,
	NodeData,
	EdgeData,
	Direction,
	ReadableGraph,
} from "../../graph";
import type { AsyncReadableGraph } from "../../graph/async-interfaces";

/**
 * Wrap a synchronous ReadableGraph as an AsyncReadableGraph.
 *
 * @param graph - The synchronous graph to wrap
 * @returns An AsyncReadableGraph that delegates to the sync graph
 */
export function wrapAsync<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
): AsyncReadableGraph<N, E> {
	return {
		directed: graph.directed,

		get nodeCount(): Promise<number> {
			return Promise.resolve(graph.nodeCount);
		},

		get edgeCount(): Promise<number> {
			return Promise.resolve(graph.edgeCount);
		},

		hasNode(id: NodeId): Promise<boolean> {
			return Promise.resolve(graph.hasNode(id));
		},

		getNode(id: NodeId): Promise<N | undefined> {
			return Promise.resolve(graph.getNode(id));
		},

		nodeIds(): AsyncIterable<NodeId> {
			const syncIterable = graph.nodeIds();
			return {
				[Symbol.asyncIterator](): AsyncIterator<NodeId> {
					const iter = syncIterable[Symbol.iterator]();
					return {
						next(): Promise<IteratorResult<NodeId>> {
							return Promise.resolve(iter.next());
						},
					};
				},
			};
		},

		neighbours(id: NodeId, direction?: Direction): AsyncIterable<NodeId> {
			const syncIterable = graph.neighbours(id, direction);
			return {
				[Symbol.asyncIterator](): AsyncIterator<NodeId> {
					const iter = syncIterable[Symbol.iterator]();
					return {
						next(): Promise<IteratorResult<NodeId>> {
							return Promise.resolve(iter.next());
						},
					};
				},
			};
		},

		degree(id: NodeId, direction?: Direction): Promise<number> {
			return Promise.resolve(graph.degree(id, direction));
		},

		getEdge(source: NodeId, target: NodeId): Promise<E | undefined> {
			return Promise.resolve(graph.getEdge(source, target));
		},

		edges(): AsyncIterable<E> {
			const syncIterable = graph.edges();
			return {
				[Symbol.asyncIterator](): AsyncIterator<E> {
					const iter = syncIterable[Symbol.iterator]();
					return {
						next(): Promise<IteratorResult<E>> {
							return Promise.resolve(iter.next());
						},
					};
				},
			};
		},
	};
}
