import { create } from "zustand";

interface NodePosition {
	readonly x: number;
	readonly y: number;
}

type PositionMap = ReadonlyMap<string, NodePosition>;

interface Viewport {
	readonly zoom: number;
	readonly pan: { readonly x: number; readonly y: number };
}

interface LayoutState {
	readonly layoutGraphVersion: number;
	readonly positions: PositionMap | null;
	readonly viewport: Viewport | null;
	readonly setPositions: (
		graphVersion: number,
		positions: Map<string, NodePosition>,
	) => void;
	readonly updateNodePosition: (nodeId: string, position: NodePosition) => void;
	readonly setViewport: (viewport: Viewport) => void;
	readonly reset: () => void;
}

export type { NodePosition };
export type { Viewport };

export const useLayoutStore = create<LayoutState>()((set, get) => ({
	layoutGraphVersion: -1,
	positions: null,
	viewport: null,

	setPositions: (graphVersion, positions) => {
		set({ layoutGraphVersion: graphVersion, positions });
	},

	updateNodePosition: (nodeId, position) => {
		const current = get().positions;
		if (current === null) {
			return;
		}
		const newPositions = new Map(current);
		newPositions.set(nodeId, position);
		set({ positions: newPositions });
	},

	setViewport: (viewport) => {
		set({ viewport });
	},

	reset: () => {
		set({ layoutGraphVersion: -1, positions: null, viewport: null });
	},
}));
