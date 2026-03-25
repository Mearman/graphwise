import { create } from "zustand";
import type { ExpansionResult, ExpansionStats } from "graphwise/expansion";
import type { ExpansionAlgorithmName } from "../engine/algorithm-registry";

export interface ComparisonEntry {
	readonly algorithmName: ExpansionAlgorithmName;
	readonly stats: ExpansionStats;
	/** Full expansion result including discovered paths (for ranking integration) */
	readonly result: ExpansionResult;
}

interface ComparisonState {
	/** Selected algorithms for comparison */
	readonly selectedAlgorithms: readonly ExpansionAlgorithmName[];
	/** Comparison results */
	readonly entries: readonly ComparisonEntry[];
	/** Whether comparison is running */
	readonly isRunning: boolean;
	/** Total comparison duration */
	readonly totalDurationMs: number;
	/** Currently highlighted algorithm (for canvas replay) */
	readonly highlightedAlgorithm: ExpansionAlgorithmName | null;

	/** Set selected algorithms */
	readonly setSelectedAlgorithms: (
		algorithms: readonly ExpansionAlgorithmName[],
	) => void;
	/** Toggle an algorithm in/out of selection */
	readonly toggleAlgorithm: (name: ExpansionAlgorithmName) => void;
	/** Load comparison results */
	readonly loadResults: (
		entries: readonly ComparisonEntry[],
		totalDurationMs: number,
	) => void;
	/** Set running state */
	readonly setRunning: (isRunning: boolean) => void;
	/** Highlight an algorithm for replay */
	readonly setHighlightedAlgorithm: (
		name: ExpansionAlgorithmName | null,
	) => void;
	/** Reset comparison results */
	readonly reset: () => void;
	/** Clear all selections */
	readonly clearSelection: () => void;
}

export const useComparisonStore = create<ComparisonState>()((set, get) => ({
	selectedAlgorithms: [],
	entries: [],
	isRunning: false,
	totalDurationMs: 0,
	highlightedAlgorithm: null,

	setSelectedAlgorithms: (algorithms) => {
		set({ selectedAlgorithms: algorithms });
	},

	toggleAlgorithm: (name) => {
		const { selectedAlgorithms } = get();
		if (selectedAlgorithms.includes(name)) {
			set({
				selectedAlgorithms: selectedAlgorithms.filter((a) => a !== name),
			});
		} else {
			set({
				selectedAlgorithms: [...selectedAlgorithms, name],
			});
		}
	},

	loadResults: (entries, totalDurationMs) => {
		set({ entries, totalDurationMs, isRunning: false });
	},

	setRunning: (isRunning) => {
		set({ isRunning });
	},

	setHighlightedAlgorithm: (name) => {
		set({ highlightedAlgorithm: name });
	},

	reset: () => {
		set({
			entries: [],
			isRunning: false,
			totalDurationMs: 0,
			highlightedAlgorithm: null,
		});
	},

	clearSelection: () => {
		set({ selectedAlgorithms: [] });
	},
}));
