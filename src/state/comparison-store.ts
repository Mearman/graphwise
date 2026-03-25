import { create } from "zustand";
import type { ExpansionResult, ExpansionStats } from "graphwise/expansion";
import type { ExpansionAlgorithmName } from "../engine/algorithm-registry";
import type { MIVariantName } from "graphwise/ranking/mi";

export interface ComparisonEntry {
	readonly algorithmName: ExpansionAlgorithmName;
	readonly stats: ExpansionStats;
	/** Full expansion result including discovered paths (for ranking integration) */
	readonly result: ExpansionResult;
}

export interface MIVariantComparisonEntry {
	readonly variant: MIVariantName;
	readonly pathsCount: number;
	readonly meanSalience: number;
	readonly durationMs: number;
}

export type ComparisonStage =
	| "expansion"
	| "mi"
	| "ranking"
	| "seed-selection"
	| "subgraph-extraction";

interface ComparisonState {
	/** Active stage being compared */
	readonly comparisonStage: ComparisonStage;
	/** Selected algorithms for comparison */
	readonly selectedAlgorithms: readonly ExpansionAlgorithmName[];
	/** Selected MI variants for comparison */
	readonly selectedMIVariants: readonly MIVariantName[];
	/** Comparison results */
	readonly entries: readonly ComparisonEntry[];
	/** MI variant comparison results */
	readonly miEntries: readonly MIVariantComparisonEntry[];
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
	/** Set active comparison stage */
	readonly setComparisonStage: (stage: ComparisonStage) => void;
	/** Set selected MI variants */
	readonly setSelectedMIVariants: (variants: readonly MIVariantName[]) => void;
	/** Toggle an MI variant in/out of selection */
	readonly toggleMIVariant: (variant: MIVariantName) => void;
	/** Toggle an algorithm in/out of selection */
	readonly toggleAlgorithm: (name: ExpansionAlgorithmName) => void;
	/** Load comparison results */
	readonly loadResults: (
		entries: readonly ComparisonEntry[],
		totalDurationMs: number,
	) => void;
	/** Load MI comparison results */
	readonly loadMIResults: (
		entries: readonly MIVariantComparisonEntry[],
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
	comparisonStage: "expansion",
	selectedAlgorithms: [],
	selectedMIVariants: [],
	entries: [],
	miEntries: [],
	isRunning: false,
	totalDurationMs: 0,
	highlightedAlgorithm: null,

	setComparisonStage: (stage) => {
		set({ comparisonStage: stage });
	},

	setSelectedAlgorithms: (algorithms) => {
		set({ selectedAlgorithms: algorithms });
	},

	setSelectedMIVariants: (variants) => {
		set({ selectedMIVariants: variants });
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

	toggleMIVariant: (variant) => {
		const { selectedMIVariants } = get();
		if (selectedMIVariants.includes(variant)) {
			set({
				selectedMIVariants: selectedMIVariants.filter((v) => v !== variant),
			});
		} else {
			set({
				selectedMIVariants: [...selectedMIVariants, variant],
			});
		}
	},

	loadResults: (entries, totalDurationMs) => {
		set({
			comparisonStage: "expansion",
			entries,
			totalDurationMs,
			isRunning: false,
		});
	},

	loadMIResults: (entries, totalDurationMs) => {
		set({
			comparisonStage: "mi",
			miEntries: entries,
			totalDurationMs,
			isRunning: false,
		});
	},

	setRunning: (isRunning) => {
		set({ isRunning });
	},

	setHighlightedAlgorithm: (name) => {
		set({ highlightedAlgorithm: name });
	},

	reset: () => {
		set({
			comparisonStage: "expansion",
			entries: [],
			miEntries: [],
			isRunning: false,
			totalDurationMs: 0,
			highlightedAlgorithm: null,
		});
	},

	clearSelection: () => {
		set({ selectedAlgorithms: [], selectedMIVariants: [] });
	},
}));
