import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GraphClassConfig, GraphClassKey } from "../engine/graph-class";
import { DEFAULT_GRAPH_CLASS, applyConstraints } from "../engine/graph-class";

interface GenerationState {
	readonly nodeCount: number;
	readonly seed: number;
	readonly graphClass: GraphClassConfig;
	readonly maxIterations: number;
	readonly setNodeCount: (count: number) => void;
	readonly setSeed: (seed: number) => void;
	readonly setGraphClassToggle: (key: GraphClassKey, value: boolean) => void;
	/** Bulk-set the graph class without constraint cascading (for URL restore). */
	readonly setGraphClass: (config: GraphClassConfig) => void;
	readonly setMaxIterations: (maxIterations: number) => void;
}

export const useGenerationStore = create<GenerationState>()(
	persist(
		(set) => ({
			nodeCount: 20,
			seed: 42,
			graphClass: DEFAULT_GRAPH_CLASS,
			maxIterations: 0,
			setNodeCount: (count) => {
				set({ nodeCount: count });
			},
			setSeed: (seed) => {
				set({ seed });
			},
			setGraphClassToggle: (key, value) => {
				set((state) => {
					const updated = { ...state.graphClass, [key]: value };
					return { graphClass: applyConstraints(updated, key) };
				});
			},
			setGraphClass: (config) => {
				set({ graphClass: config });
			},
			setMaxIterations: (maxIterations) => {
				set({ maxIterations });
			},
		}),
		{
			name: "graphwise-generation",
			version: 2,
			migrate: (persisted, version) => {
				let state =
					typeof persisted === "object" && persisted !== null
						? { ...persisted }
						: {};
				if (version < 1) {
					if (!("graphClass" in state)) {
						state = { ...state, graphClass: DEFAULT_GRAPH_CLASS };
					}
				}
				if (version < 2) {
					if (!("maxIterations" in state)) {
						state = { ...state, maxIterations: 0 };
					}
				}
				return state;
			},
		},
	),
);
