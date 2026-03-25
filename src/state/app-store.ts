import { create } from "zustand";

interface AppState {
	readonly selectedFixture: string;
	readonly setSelectedFixture: (name: string) => void;
}

export const useAppStore = create<AppState>()((set) => ({
	selectedFixture: "three-community",
	setSelectedFixture: (name) => {
		set({ selectedFixture: name });
	},
}));
