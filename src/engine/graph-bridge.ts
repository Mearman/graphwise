import type { NodeId } from "graphwise/graph";
import { AdjacencyMapGraph } from "graphwise/graph";
import type { Seed } from "graphwise/expansion";

/** Serialisable node for Cytoscape and URL state */
export interface SerialNode {
	readonly id: string;
	readonly label: string;
	readonly type: string;
	readonly weight: number;
}

/** Serialisable edge for Cytoscape and URL state */
export interface SerialEdge {
	readonly source: string;
	readonly target: string;
	readonly type: string;
	readonly weight: number;
}

/** Serialisable graph data */
export interface SerialGraph {
	readonly directed: boolean;
	readonly nodes: readonly SerialNode[];
	readonly edges: readonly SerialEdge[];
}

/** Cytoscape node element */
export interface CytoscapeNode {
	readonly data: {
		readonly id: string;
		readonly label: string;
		readonly type: string;
		readonly weight: number;
		readonly seedRole: string | undefined;
	};
}

/** Cytoscape edge element */
export interface CytoscapeEdge {
	readonly data: {
		readonly id: string;
		readonly source: string;
		readonly target: string;
		readonly type: string;
		readonly weight: number;
	};
}

/** Helper to safely extract string label from unknown node data */
function extractLabel(label: unknown, fallback: string): string {
	if (typeof label === "string") return label;
	return fallback;
}

/** Convert AdjacencyMapGraph to serialisable format */
export function graphToSerial(
	graph: AdjacencyMapGraph,
	directed: boolean,
): SerialGraph {
	const nodes: SerialNode[] = [];
	const edges: SerialEdge[] = [];
	const seenEdges = new Set<string>();

	for (const id of graph.nodeIds()) {
		const node = graph.getNode(id);
		nodes.push({
			id,
			label: extractLabel(node?.label, id),
			type: node?.type ?? "node",
			weight: node?.weight ?? 1,
		});
	}

	for (const edge of graph.edges()) {
		// For undirected graphs, avoid duplicate edges
		const edgeKey =
			edge.source < edge.target
				? `${edge.source}-${edge.target}`
				: `${edge.target}-${edge.source}`;

		if (!directed && seenEdges.has(edgeKey)) {
			continue;
		}
		seenEdges.add(edgeKey);

		edges.push({
			source: edge.source,
			target: edge.target,
			type: edge.type ?? "edge",
			weight: edge.weight ?? 1,
		});
	}

	return { directed, nodes, edges };
}

/** Convert serialisable format back to AdjacencyMapGraph */
export function serialToGraph(data: SerialGraph): AdjacencyMapGraph {
	const graph = data.directed
		? AdjacencyMapGraph.directed()
		: AdjacencyMapGraph.undirected();

	for (const node of data.nodes) {
		graph.addNode({
			id: node.id,
			label: node.label,
			type: node.type,
			weight: node.weight,
		});
	}

	for (const edge of data.edges) {
		graph.addEdge({
			source: edge.source,
			target: edge.target,
			type: edge.type,
			weight: edge.weight,
		});
	}

	return graph;
}

/** Convert to Cytoscape elements format */
export function graphToCytoscapeElements(
	graph: AdjacencyMapGraph,
	seeds: readonly Seed[],
): {
	readonly nodes: readonly CytoscapeNode[];
	readonly edges: readonly CytoscapeEdge[];
} {
	const nodes: CytoscapeNode[] = [];
	const edges: CytoscapeEdge[] = [];
	const seedMap = new Map<NodeId, string>();
	const seenEdges = new Set<string>();

	for (const seed of seeds) {
		const role = seed.role ?? "bidirectional";
		seedMap.set(seed.id, role);
	}

	for (const id of graph.nodeIds()) {
		const node = graph.getNode(id);
		const seedRole = seedMap.get(id);

		nodes.push({
			data: {
				id,
				label: extractLabel(node?.label, id),
				type: node?.type ?? "node",
				weight: node?.weight ?? 1,
				seedRole,
			},
		});
	}

	for (const edge of graph.edges()) {
		const edgeKey =
			edge.source < edge.target
				? `${edge.source}-${edge.target}`
				: `${edge.target}-${edge.source}`;

		if (!graph.directed && seenEdges.has(edgeKey)) {
			continue;
		}
		seenEdges.add(edgeKey);

		edges.push({
			data: {
				id: edgeKey,
				source: edge.source,
				target: edge.target,
				type: edge.type ?? "edge",
				weight: edge.weight ?? 1,
			},
		});
	}

	return { nodes, edges };
}
