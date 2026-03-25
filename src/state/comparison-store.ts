import { create } from "zustand";
import type { ExpansionStats } from "graphwise/expansion";
import type { ExpansionAlgorithmName } from "../engine/algorithm-registry";

interface ComparisonEntry {
	readonly algorithmName: ExpansionAlgorithmName;
	readonly stats: ExpansionStats;
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
	/** Reset */
	readonly reset: () => void;
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
		const index = selectedAlgorithms.indexOf(name);
		if (index >= 0) {
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
			selectedAlgorithms: [],
			entries: [],
			isRunning: false,
			totalDurationMs: 0,
			highlightedAlgorithm: null,
		});
	},
}));
