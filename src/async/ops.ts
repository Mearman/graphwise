/**
 * Type-safe yield helpers for graph operations.
 *
 * Each function is a sub-generator that yields one GraphOp and returns
 * the correctly-typed result. Narrowing is done via the tagged discriminated
 * union in GraphOpResponse — no type assertions needed.
 *
 * Use with `yield*` inside algorithm generators.
 *
 * @module async/ops
 */

import type { NodeId, NodeData, EdgeData, Direction } from "../graph";
import type { GraphOp, GraphOpResponse, ProgressStats } from "./protocol";

export function* opNeighbours<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
>(
	id: NodeId,
	direction?: Direction,
): Generator<GraphOp, readonly NodeId[], GraphOpResponse<N, E>> {
	const op: GraphOp =
		direction !== undefined
			? { tag: "neighbours", id, direction }
			: { tag: "neighbours", id };
	const response: GraphOpResponse<N, E> = yield op;
	if (response.tag !== "neighbours") {
		throw new TypeError(`Expected neighbours response, got ${response.tag}`);
	}
	return response.value;
}

export function* opDegree<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
>(
	id: NodeId,
	direction?: Direction,
): Generator<GraphOp, number, GraphOpResponse<N, E>> {
	const op: GraphOp =
		direction !== undefined
			? { tag: "degree", id, direction }
			: { tag: "degree", id };
	const response: GraphOpResponse<N, E> = yield op;
	if (response.tag !== "degree") {
		throw new TypeError(`Expected degree response, got ${response.tag}`);
	}
	return response.value;
}

export function* opGetNode<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
>(id: NodeId): Generator<GraphOp, N | undefined, GraphOpResponse<N, E>> {
	const response: GraphOpResponse<N, E> = yield { tag: "getNode", id };
	if (response.tag !== "getNode") {
		throw new TypeError(`Expected getNode response, got ${response.tag}`);
	}
	return response.value;
}

export function* opGetEdge<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
>(
	source: NodeId,
	target: NodeId,
): Generator<GraphOp, E | undefined, GraphOpResponse<N, E>> {
	const response: GraphOpResponse<N, E> = yield {
		tag: "getEdge",
		source,
		target,
	};
	if (response.tag !== "getEdge") {
		throw new TypeError(`Expected getEdge response, got ${response.tag}`);
	}
	return response.value;
}

export function* opHasNode<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
>(id: NodeId): Generator<GraphOp, boolean, GraphOpResponse<N, E>> {
	const response: GraphOpResponse<N, E> = yield { tag: "hasNode", id };
	if (response.tag !== "hasNode") {
		throw new TypeError(`Expected hasNode response, got ${response.tag}`);
	}
	return response.value;
}

export function* opYield<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
>(): Generator<GraphOp, void, GraphOpResponse<N, E>> {
	yield { tag: "yield" };
}

export function* opProgress<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
>(stats: ProgressStats): Generator<GraphOp, void, GraphOpResponse<N, E>> {
	yield { tag: "progress", stats };
}

export function* opBatchNeighbours<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
>(
	ids: readonly NodeId[],
	direction?: Direction,
): Generator<
	GraphOp,
	ReadonlyMap<NodeId, readonly NodeId[]>,
	GraphOpResponse<N, E>
> {
	const op: GraphOp =
		direction !== undefined
			? { tag: "batchNeighbours", ids, direction }
			: { tag: "batchNeighbours", ids };
	const response: GraphOpResponse<N, E> = yield op;
	if (response.tag !== "batchNeighbours") {
		throw new TypeError(
			`Expected batchNeighbours response, got ${response.tag}`,
		);
	}
	return response.value;
}

export function* opBatchDegree<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
>(
	ids: readonly NodeId[],
	direction?: Direction,
): Generator<GraphOp, ReadonlyMap<NodeId, number>, GraphOpResponse<N, E>> {
	const op: GraphOp =
		direction !== undefined
			? { tag: "batchDegree", ids, direction }
			: { tag: "batchDegree", ids };
	const response: GraphOpResponse<N, E> = yield op;
	if (response.tag !== "batchDegree") {
		throw new TypeError(`Expected batchDegree response, got ${response.tag}`);
	}
	return response.value;
}
