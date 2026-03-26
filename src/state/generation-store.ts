import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GraphClassConfig, GraphClassKey } from "../engine/graph-class";
import { DEFAULT_GRAPH_CLASS, applyConstraints } from "../engine/graph-class";

interface GenerationState {
	readonly nodeCount: number;
	readonly seed: number;
	readonly graphClass: GraphClassConfig;
	readonly setNodeCount: (count: number) => void;
	readonly setSeed: (seed: number) => void;
	readonly setGraphClassToggle: (key: GraphClassKey, value: boolean) => void;
}

export const useGenerationStore = create<GenerationState>()(
	persist(
		(set) => ({
			nodeCount: 20,
			seed: 42,
			graphClass: DEFAULT_GRAPH_CLASS,
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
		}),
		{
			name: "graphwise-generation",
			version: 1,
			migrate: (persisted) => {
				if (
					typeof persisted === "object" &&
					persisted !== null &&
					!("graphClass" in persisted)
				) {
					return { ...persisted, graphClass: DEFAULT_GRAPH_CLASS };
				}
				return persisted;
			},
		},
	),
);
