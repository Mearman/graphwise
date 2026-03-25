import { create } from "zustand";
import type { NodeId } from "graphwise/graph";
import { AdjacencyMapGraph } from "graphwise/graph";
import type { Seed, SeedRole } from "graphwise/expansion";

interface GraphNode {
	readonly id: string;
	readonly label: string;
	readonly type: string;
	readonly weight: number;
}

interface GraphEdge {
	readonly source: string;
	readonly target: string;
	readonly type: string;
	readonly weight: number;
}

interface GraphState {
	/** The current graph instance */
	readonly graph: AdjacencyMapGraph;
	/** Whether the graph is directed */
	readonly directed: boolean;
	/** Seed nodes for expansion */
	readonly seeds: readonly Seed[];
	/** Currently selected node (for editing) */
	readonly selectedNode: NodeId | null;
	/** Currently selected edge (for editing) */
	readonly selectedEdge: {
		readonly source: NodeId;
		readonly target: NodeId;
	} | null;
	/** Version counter for re-render triggers */
	readonly version: number;
	/** Whether graph was loaded from URL (prevents default fixture load) */
	readonly graphLoadedFromUrl: boolean;

	/** Replace the entire graph */
	readonly setGraph: (graph: AdjacencyMapGraph, directed: boolean) => void;
	/** Add a node */
	readonly addNode: (node: GraphNode) => void;
	/** Remove a node */
	readonly removeNode: (id: NodeId) => void;
	/** Update a node's properties */
	readonly updateNode: (id: NodeId, updates: Partial<GraphNode>) => void;
	/** Add an edge */
	readonly addEdge: (edge: GraphEdge) => void;
	/** Remove an edge */
	readonly removeEdge: (source: NodeId, target: NodeId) => void;
	/** Update an edge's properties */
	readonly updateEdge: (
		source: NodeId,
		target: NodeId,
		updates: Partial<GraphEdge>,
	) => void;
	/** Set seeds */
	readonly setSeeds: (seeds: readonly Seed[]) => void;
	/** Toggle a node's seed role */
	readonly toggleSeed: (id: NodeId, role: SeedRole) => void;
	/** Select a node */
	readonly selectNode: (id: NodeId | null) => void;
	/** Select an edge */
	readonly selectEdge: (
		edge: { readonly source: NodeId; readonly target: NodeId } | null,
	) => void;
	/** Reset to empty graph */
	readonly reset: () => void;
	/** Mark that graph was loaded from URL */
	readonly setGraphLoadedFromUrl: (loaded: boolean) => void;
}

function createEmptyGraph(): AdjacencyMapGraph {
	return AdjacencyMapGraph.undirected();
}

export const useGraphStore = create<GraphState>()((set, get) => ({
	graph: createEmptyGraph(),
	directed: false,
	seeds: [],
	selectedNode: null,
	selectedEdge: null,
	version: 0,
	graphLoadedFromUrl: false,

	setGraph: (graph, directed) => {
		set({ graph, directed, version: get().version + 1 });
	},

	addNode: (node) => {
		const { graph, version } = get();
		graph.addNode({
			id: node.id,
			label: node.label,
			type: node.type,
			weight: node.weight,
		});
		set({ version: version + 1 });
	},

	removeNode: (id) => {
		const { graph, seeds, selectedNode, selectedEdge, version } = get();
		graph.removeNode(id);
		set({
			seeds: seeds.filter((s) => s.id !== id),
			selectedNode: selectedNode === id ? null : selectedNode,
			selectedEdge:
				selectedEdge !== null &&
				(selectedEdge.source === id || selectedEdge.target === id)
					? null
					: selectedEdge,
			version: version + 1,
		});
	},

	updateNode: (id, updates) => {
		const { graph, version } = get();
		const existing = graph.getNode(id);
		if (existing === undefined) return;

		// Remove and re-add with updated properties
		graph.removeNode(id);
		graph.addNode({
			id,
			label: updates.label ?? existing.label ?? id,
			type: updates.type ?? existing.type ?? "node",
			weight: updates.weight ?? existing.weight ?? 1,
		});
		set({ version: version + 1 });
	},

	addEdge: (edge) => {
		const { graph, version } = get();
		graph.addEdge({
			source: edge.source,
			target: edge.target,
			type: edge.type,
			weight: edge.weight,
		});
		set({ version: version + 1 });
	},

	removeEdge: (source, target) => {
		const { graph, selectedEdge, version } = get();
		graph.removeEdge(source, target);
		set({
			selectedEdge:
				selectedEdge !== null &&
				selectedEdge.source === source &&
				selectedEdge.target === target
					? null
					: selectedEdge,
			version: version + 1,
		});
	},

	setSeeds: (seeds) => {
		set({ seeds });
	},

	toggleSeed: (id, role) => {
		const { seeds } = get();
		const existing = seeds.find((s) => s.id === id);

		if (existing?.role === role) {
			// Remove seed
			set({ seeds: seeds.filter((s) => s.id !== id) });
		} else if (existing !== undefined) {
			// Change role
			set({
				seeds: seeds.map((s) => (s.id === id ? { id, role } : s)),
			});
		} else {
			// Add new seed
			set({ seeds: [...seeds, { id, role }] });
		}
	},

	selectNode: (id) => {
		set({ selectedNode: id, selectedEdge: null });
	},

	selectEdge: (edge) => {
		set({ selectedNode: null, selectedEdge: edge });
	},

	updateEdge: (source, target, updates) => {
		const { graph, version } = get();
		const existing = graph.getEdge(source, target);
		if (existing === undefined) return;

		// Remove and re-add with updated properties
		graph.removeEdge(source, target);
		graph.addEdge({
			source,
			target,
			type: updates.type ?? existing.type ?? "edge",
			weight: updates.weight ?? existing.weight ?? 1,
		});
		set({ version: version + 1 });
	},

	reset: () => {
		set({
			graph: createEmptyGraph(),
			directed: false,
			seeds: [],
			selectedNode: null,
			selectedEdge: null,
			version: 0,
			graphLoadedFromUrl: false,
		});
	},

	setGraphLoadedFromUrl: (loaded) => {
		set({ graphLoadedFromUrl: loaded });
	},
}));
