import { create } from "zustand";
import type { Core } from "cytoscape";

interface CytoscapeInstancesState {
	readonly instances: ReadonlyMap<string, Core>;
	readonly registerInstance: (id: string, cy: Core) => void;
	readonly unregisterInstance: (id: string) => void;
}

export const useCytoscapeInstancesStore = create<CytoscapeInstancesState>()(
	(set) => ({
		instances: new Map<string, Core>(),

		registerInstance: (id, cy) => {
			set((state) => {
				const newMap = new Map(state.instances);
				newMap.set(id, cy);
				return { instances: newMap };
			});
		},

		unregisterInstance: (id) => {
			set((state) => {
				const newMap = new Map(state.instances);
				newMap.delete(id);
				return { instances: newMap };
			});
		},
	}),
);
