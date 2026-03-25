import { create } from "zustand";
import type { ExpansionResult } from "graphwise/expansion";
import type { PARSEResult } from "graphwise/ranking";
import type { MIVariantName } from "graphwise/ranking/mi";
import type {
	ExpansionAlgorithmName,
	RankingAlgorithmName,
} from "../engine/algorithm-registry";

export type ViewMode = "columns" | "overlay";

export interface PipelineColumn {
	readonly id: string;
	readonly expansionAlgorithm: ExpansionAlgorithmName | null;
	readonly miVariant: MIVariantName;
	readonly rankingAlgorithm: RankingAlgorithmName;
	readonly expansionResult: ExpansionResult | null;
	readonly rankingResult: PARSEResult | null;
	readonly isRunning: boolean;
}

interface ColumnState {
	readonly columns: readonly PipelineColumn[];
	readonly viewMode: ViewMode;

	readonly addColumn: () => void;
	readonly removeColumn: (id: string) => void;
	readonly updateColumn: (
		id: string,
		updates: Partial<
			Omit<
				PipelineColumn,
				"id" | "expansionResult" | "rankingResult" | "isRunning"
			>
		>,
	) => void;
	readonly setExpansionResult: (
		id: string,
		result: ExpansionResult | null,
	) => void;
	readonly setRankingResult: (id: string, result: PARSEResult | null) => void;
	readonly setRunning: (id: string, isRunning: boolean) => void;
	readonly setViewMode: (mode: ViewMode) => void;
	readonly runAll: () => void;
	readonly reset: () => void;
}

const DEFAULT_MI_VARIANT: MIVariantName = "jaccard";
const DEFAULT_RANKING_ALGORITHM: RankingAlgorithmName = "parse";

function createDefaultColumn(): PipelineColumn {
	return {
		id: crypto.randomUUID(),
		expansionAlgorithm: null,
		miVariant: DEFAULT_MI_VARIANT,
		rankingAlgorithm: DEFAULT_RANKING_ALGORITHM,
		expansionResult: null,
		rankingResult: null,
		isRunning: false,
	};
}

export const useColumnStore = create<ColumnState>()((set, get) => ({
	columns: [createDefaultColumn()],
	viewMode: "columns",

	addColumn: () => {
		set((state) => ({
			columns: [...state.columns, createDefaultColumn()],
		}));
	},

	removeColumn: (id) => {
		const { columns } = get();
		// Prevent removing the last column
		if (columns.length <= 1) return;

		set({
			columns: columns.filter((col) => col.id !== id),
		});
	},

	updateColumn: (id, updates) => {
		set((state) => ({
			columns: state.columns.map((col) =>
				col.id === id ? { ...col, ...updates } : col,
			),
		}));
	},

	setExpansionResult: (id, result) => {
		set((state) => ({
			columns: state.columns.map((col) =>
				col.id === id
					? { ...col, expansionResult: result, isRunning: false }
					: col,
			),
		}));
	},

	setRankingResult: (id, result) => {
		set((state) => ({
			columns: state.columns.map((col) =>
				col.id === id
					? { ...col, rankingResult: result, isRunning: false }
					: col,
			),
		}));
	},

	setRunning: (id, isRunning) => {
		set((state) => ({
			columns: state.columns.map((col) =>
				col.id === id ? { ...col, isRunning } : col,
			),
		}));
	},

	setViewMode: (mode) => {
		set({ viewMode: mode });
	},

	runAll: () => {
		// This action is a signal - the actual running happens in column-runner.ts
		// Mark all columns with algorithms as running
		set((state) => ({
			columns: state.columns.map((col) =>
				col.expansionAlgorithm !== null ? { ...col, isRunning: true } : col,
			),
		}));
	},

	reset: () => {
		set({
			columns: [createDefaultColumn()],
			viewMode: "columns",
		});
	},
}));
