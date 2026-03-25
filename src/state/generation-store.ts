import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GenerationState {
	readonly nodeCount: number;
	readonly seed: number;
	readonly setNodeCount: (count: number) => void;
	readonly setSeed: (seed: number) => void;
}

export const useGenerationStore = create<GenerationState>()(
	persist(
		(set) => ({
			nodeCount: 20,
			seed: 42,
			setNodeCount: (count) => {
				set({ nodeCount: count });
			},
			setSeed: (seed) => {
				set({ seed });
			},
		}),
		{
			name: "graphwise-generation",
		},
	),
);
