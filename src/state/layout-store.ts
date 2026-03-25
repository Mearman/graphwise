import { create } from "zustand";

interface NodePosition {
	readonly x: number;
	readonly y: number;
}

type PositionMap = ReadonlyMap<string, NodePosition>;

interface LayoutState {
	readonly layoutGraphVersion: number;
	readonly positions: PositionMap | null;
	readonly setPositions: (
		graphVersion: number,
		positions: Map<string, NodePosition>,
	) => void;
	readonly reset: () => void;
}

export type { NodePosition };

export const useLayoutStore = create<LayoutState>()((set) => ({
	layoutGraphVersion: -1,
	positions: null,

	setPositions: (graphVersion, positions) => {
		set({ layoutGraphVersion: graphVersion, positions });
	},

	reset: () => {
		set({ layoutGraphVersion: -1, positions: null });
	},
}));
