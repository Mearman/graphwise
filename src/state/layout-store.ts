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
	readonly updateNodePosition: (nodeId: string, position: NodePosition) => void;
	readonly reset: () => void;
}

export type { NodePosition };

export const useLayoutStore = create<LayoutState>()((set, get) => ({
	layoutGraphVersion: -1,
	positions: null,

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

	reset: () => {
		set({ layoutGraphVersion: -1, positions: null });
	},
}));
