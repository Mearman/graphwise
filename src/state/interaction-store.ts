import { create } from "zustand";

interface InteractionState {
	readonly zoomEnabled: boolean;
	readonly panEnabled: boolean;
	readonly setZoomEnabled: (enabled: boolean) => void;
	readonly setPanEnabled: (enabled: boolean) => void;
}

export const useInteractionStore = create<InteractionState>()((set) => ({
	zoomEnabled: true,
	panEnabled: true,
	setZoomEnabled: (enabled) => {
		set({ zoomEnabled: enabled });
	},
	setPanEnabled: (enabled) => {
		set({ panEnabled: enabled });
	},
}));
