import { useEffect, useRef } from "react";
import {
	deserialiseFromHash,
	updateHash,
	type SerialisedState,
} from "../../state/url-state";
import { useGraphStore } from "../../state/graph-store";
import { useAnimationStore } from "../../state/animation-store";
import { useTourStore } from "../../state/tour-store";
import { AdjacencyMapGraph } from "graphwise/graph";
import type { Seed, SeedRole } from "graphwise/expansion";

/** Debounce duration for URL updates (ms) */
const DEBOUNCE_MS = 300;

function isSeedRole(value: string): value is SeedRole {
	return value === "source" || value === "target" || value === "bidirectional";
}

function getProperty(data: unknown, key: string): unknown {
	if (typeof data === "object" && data !== null) {
		// Spread into new object to safely access properties
		const entries = Object.entries(data);
		for (const [k, v] of entries) {
			if (k === key) return v;
		}
	}
	return undefined;
}

function getString(data: unknown, key: string): string | undefined {
	const value = getProperty(data, key);
	return typeof value === "string" ? value : undefined;
}

function getNumber(data: unknown, key: string): number | undefined {
	const value = getProperty(data, key);
	return typeof value === "number" ? value : undefined;
}

export function useUrlSync(): void {
	const graph = useGraphStore((state) => state.graph);
	const directed = useGraphStore((state) => state.directed);
	const seeds = useGraphStore((state) => state.seeds);
	const setGraph = useGraphStore((state) => state.setGraph);
	const setSeeds = useGraphStore((state) => state.setSeeds);

	const algorithmName = useAnimationStore((state) => state.algorithmName);
	const currentFrameIndex = useAnimationStore(
		(state) => state.currentFrameIndex,
	);

	const mode = useTourStore((state) => state.mode);

	const isInitialLoad = useRef(true);
	const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Load from URL on mount
	useEffect(() => {
		const state = deserialiseFromHash();
		if (state === null) return;

		// Reconstruct graph
		const newGraph = state.g.d
			? AdjacencyMapGraph.directed()
			: AdjacencyMapGraph.undirected();

		for (const node of state.g.n) {
			if (
				node.l !== undefined &&
				node.t !== undefined &&
				node.w !== undefined
			) {
				newGraph.addNode({
					id: node.i,
					label: node.l,
					type: node.t,
					weight: node.w,
				});
			} else if (node.l !== undefined && node.t !== undefined) {
				newGraph.addNode({ id: node.i, label: node.l, type: node.t });
			} else if (node.l !== undefined) {
				newGraph.addNode({ id: node.i, label: node.l });
			} else {
				newGraph.addNode({ id: node.i });
			}
		}

		for (const edge of state.g.e) {
			if (edge.y !== undefined && edge.w !== undefined) {
				newGraph.addEdge({
					source: edge.s,
					target: edge.t,
					type: edge.y,
					weight: edge.w,
				});
			} else if (edge.y !== undefined) {
				newGraph.addEdge({ source: edge.s, target: edge.t, type: edge.y });
			} else if (edge.w !== undefined) {
				newGraph.addEdge({ source: edge.s, target: edge.t, weight: edge.w });
			} else {
				newGraph.addEdge({ source: edge.s, target: edge.t });
			}
		}

		setGraph(newGraph, state.g.d);

		// Restore seeds
		const restoredSeeds: Seed[] = state.s.map((s): Seed => {
			if (s.r !== undefined && isSeedRole(s.r)) {
				return { id: s.i, role: s.r };
			}
			return { id: s.i };
		});
		setSeeds(restoredSeeds);

		isInitialLoad.current = false;
	}, [setGraph, setSeeds]);

	// Update URL when state changes (debounced)
	useEffect(() => {
		if (isInitialLoad.current) return;

		if (updateTimeoutRef.current !== null) {
			clearTimeout(updateTimeoutRef.current);
		}

		updateTimeoutRef.current = setTimeout(() => {
			// Extract node and edge data from graph
			const nodes: SerialisedState["g"]["n"] = [];
			const edges: SerialisedState["g"]["e"] = [];

			for (const nodeId of graph.nodeIds()) {
				const data = graph.getNode(nodeId);
				nodes.push({
					i: nodeId,
					l: getString(data, "label"),
					t: getString(data, "type"),
					w: getNumber(data, "weight"),
				});
			}

			for (const { source, target } of graph.edges()) {
				const data = graph.getEdge(source, target);
				edges.push({
					s: source,
					t: target,
					y: getString(data, "type"),
					w: getNumber(data, "weight"),
				});
			}

			const serialisedState: SerialisedState = {
				v: 1,
				g: {
					d: directed,
					n: nodes,
					e: edges,
				},
				s: seeds.map((s) => ({
					i: s.id,
					r: s.role,
				})),
				a: algorithmName.length > 0 ? algorithmName : undefined,
				f: currentFrameIndex > 0 ? currentFrameIndex : undefined,
				m: mode === "tour" ? "t" : "e",
			};

			updateHash(serialisedState);
			updateTimeoutRef.current = null;
		}, DEBOUNCE_MS);

		return () => {
			if (updateTimeoutRef.current !== null) {
				clearTimeout(updateTimeoutRef.current);
			}
		};
	}, [graph, directed, seeds, algorithmName, currentFrameIndex, mode]);
}
