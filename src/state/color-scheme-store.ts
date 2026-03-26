import { create } from "zustand";

export type ColorSchemeMode = "system" | "light" | "dark";

interface ColorSchemeState {
	readonly mode: ColorSchemeMode;
	readonly setMode: (mode: ColorSchemeMode) => void;
	readonly cycleMode: () => void;
}

const MODE_ORDER: readonly ColorSchemeMode[] = ["system", "dark", "light"];

export const useColorSchemeStore = create<ColorSchemeState>()((set, get) => ({
	mode: "system",
	setMode: (mode) => {
		set({ mode });
	},
	cycleMode: () => {
		const currentMode = get().mode;
		const currentIdx = MODE_ORDER.indexOf(currentMode);
		const nextIdx = (currentIdx + 1) % MODE_ORDER.length;
		const nextMode = MODE_ORDER[nextIdx];
		if (nextMode !== undefined) {
			set({ mode: nextMode });
		}
	},
}));
