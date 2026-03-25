import { create } from "zustand";
import type { ExpansionResult, ExpansionStats } from "graphwise/expansion";
import type { ExpansionAlgorithmName } from "../engine/algorithm-registry";
import type { MIVariantName } from "graphwise/ranking/mi";
import type {
	RankingAlgorithmName,
	SeedSelectionStrategyName,
	SubgraphExtractionStrategyName,
} from "../engine/algorithm-registry";
import type { Seed } from "graphwise/expansion";

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

export interface RankingAlgorithmComparisonEntry {
	readonly rankingAlgorithmName: RankingAlgorithmName;
	readonly miVariant: MIVariantName;
	readonly pathsCount: number;
	readonly meanSalience: number;
	readonly durationMs: number;
}

export interface SeedSelectionComparisonEntry {
	readonly strategyName: SeedSelectionStrategyName;
	readonly algorithmName: ExpansionAlgorithmName;
	readonly derivedSeeds: readonly Seed[];
	readonly stats: ExpansionStats;
	readonly normalised: {
		readonly nodesVisitedPerSeed: number;
		readonly edgesTraversedPerSeed: number;
		readonly pathsFoundPerSeed: number;
		readonly iterationsPerSeed: number;
	};
}

export interface SubgraphExtractionComparisonEntry {
	readonly strategyName: SubgraphExtractionStrategyName;
	readonly extractedPathsCount: number;
	readonly retentionRatio: number;
	readonly rankedPathsCount: number;
	readonly meanSalience: number;
	readonly rankingDurationMs: number;
	readonly totalDurationMs: number;
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
	/** Selected seed selection strategies for stage comparison */
	readonly selectedSeedStrategies: readonly SeedSelectionStrategyName[];
	/** Selected subgraph extraction strategies for stage comparison */
	readonly selectedSubgraphStrategies: readonly SubgraphExtractionStrategyName[];
	/** Selected MI variants for comparison */
	readonly selectedMIVariants: readonly MIVariantName[];
	/** Selected ranking algorithms for comparison */
	readonly selectedRankingAlgorithms: readonly RankingAlgorithmName[];
	/** Comparison results */
	readonly entries: readonly ComparisonEntry[];
	/** Seed selection stage comparison results */
	readonly seedEntries: readonly SeedSelectionComparisonEntry[];
	/** MI variant comparison results */
	readonly miEntries: readonly MIVariantComparisonEntry[];
	/** Ranking algorithm comparison results */
	readonly rankingEntries: readonly RankingAlgorithmComparisonEntry[];
	/** Subgraph extraction stage comparison results */
	readonly subgraphEntries: readonly SubgraphExtractionComparisonEntry[];
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
	/** Set selected seed strategies */
	readonly setSelectedSeedStrategies: (
		strategies: readonly SeedSelectionStrategyName[],
	) => void;
	/** Toggle a seed strategy in/out of selection */
	readonly toggleSeedStrategy: (name: SeedSelectionStrategyName) => void;
	/** Set active comparison stage */
	readonly setComparisonStage: (stage: ComparisonStage) => void;
	/** Set selected MI variants */
	readonly setSelectedMIVariants: (variants: readonly MIVariantName[]) => void;
	/** Set selected ranking algorithms */
	readonly setSelectedRankingAlgorithms: (
		algorithms: readonly RankingAlgorithmName[],
	) => void;
	/** Toggle an MI variant in/out of selection */
	readonly toggleMIVariant: (variant: MIVariantName) => void;
	/** Toggle a ranking algorithm in/out of selection */
	readonly toggleRankingAlgorithm: (name: RankingAlgorithmName) => void;
	/** Toggle a subgraph extraction strategy in/out of selection */
	readonly toggleSubgraphStrategy: (
		name: SubgraphExtractionStrategyName,
	) => void;
	/** Toggle an algorithm in/out of selection */
	readonly toggleAlgorithm: (name: ExpansionAlgorithmName) => void;
	/** Load comparison results */
	readonly loadResults: (
		entries: readonly ComparisonEntry[],
		totalDurationMs: number,
	) => void;
	/** Load seed stage comparison results */
	readonly loadSeedResults: (
		entries: readonly SeedSelectionComparisonEntry[],
		totalDurationMs: number,
	) => void;
	/** Load MI comparison results */
	readonly loadMIResults: (
		entries: readonly MIVariantComparisonEntry[],
		totalDurationMs: number,
	) => void;
	/** Load ranking algorithm comparison results */
	readonly loadRankingResults: (
		entries: readonly RankingAlgorithmComparisonEntry[],
		totalDurationMs: number,
	) => void;
	/** Load subgraph extraction comparison results */
	readonly loadSubgraphResults: (
		entries: readonly SubgraphExtractionComparisonEntry[],
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
	selectedSeedStrategies: [],
	selectedSubgraphStrategies: [],
	selectedMIVariants: [],
	selectedRankingAlgorithms: [],
	entries: [],
	seedEntries: [],
	miEntries: [],
	rankingEntries: [],
	subgraphEntries: [],
	isRunning: false,
	totalDurationMs: 0,
	highlightedAlgorithm: null,

	setComparisonStage: (stage) => {
		set({ comparisonStage: stage });
	},

	setSelectedAlgorithms: (algorithms) => {
		set({ selectedAlgorithms: algorithms });
	},

	setSelectedSeedStrategies: (strategies) => {
		set({ selectedSeedStrategies: strategies });
	},

	toggleSeedStrategy: (name) => {
		const { selectedSeedStrategies } = get();
		if (selectedSeedStrategies.includes(name)) {
			set({
				selectedSeedStrategies: selectedSeedStrategies.filter(
					(s) => s !== name,
				),
			});
		} else {
			set({
				selectedSeedStrategies: [...selectedSeedStrategies, name],
			});
		}
	},

	setSelectedMIVariants: (variants) => {
		set({ selectedMIVariants: variants });
	},

	setSelectedRankingAlgorithms: (algorithms) => {
		set({ selectedRankingAlgorithms: algorithms });
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

	toggleRankingAlgorithm: (name) => {
		const { selectedRankingAlgorithms } = get();
		if (selectedRankingAlgorithms.includes(name)) {
			set({
				selectedRankingAlgorithms: selectedRankingAlgorithms.filter(
					(algorithm) => algorithm !== name,
				),
			});
		} else {
			set({
				selectedRankingAlgorithms: [...selectedRankingAlgorithms, name],
			});
		}
	},

	toggleSubgraphStrategy: (name) => {
		const { selectedSubgraphStrategies } = get();
		if (selectedSubgraphStrategies.includes(name)) {
			set({
				selectedSubgraphStrategies: selectedSubgraphStrategies.filter(
					(strategy) => strategy !== name,
				),
			});
		} else {
			set({
				selectedSubgraphStrategies: [...selectedSubgraphStrategies, name],
			});
		}
	},

	loadResults: (entries, totalDurationMs) => {
		set({
			comparisonStage: "expansion",
			entries,
			seedEntries: [],
			miEntries: [],
			rankingEntries: [],
			subgraphEntries: [],
			totalDurationMs,
			isRunning: false,
		});
	},

	loadSeedResults: (entries, totalDurationMs) => {
		set({
			comparisonStage: "seed-selection",
			entries: [],
			seedEntries: entries,
			miEntries: [],
			rankingEntries: [],
			subgraphEntries: [],
			totalDurationMs,
			isRunning: false,
		});
	},

	loadMIResults: (entries, totalDurationMs) => {
		set({
			comparisonStage: "mi",
			entries: [],
			seedEntries: [],
			miEntries: entries,
			rankingEntries: [],
			subgraphEntries: [],
			totalDurationMs,
			isRunning: false,
		});
	},

	loadRankingResults: (entries, totalDurationMs) => {
		set({
			comparisonStage: "ranking",
			entries: [],
			seedEntries: [],
			miEntries: [],
			rankingEntries: entries,
			subgraphEntries: [],
			totalDurationMs,
			isRunning: false,
		});
	},

	loadSubgraphResults: (entries, totalDurationMs) => {
		set({
			comparisonStage: "subgraph-extraction",
			entries: [],
			seedEntries: [],
			miEntries: [],
			rankingEntries: [],
			subgraphEntries: entries,
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
			seedEntries: [],
			miEntries: [],
			rankingEntries: [],
			subgraphEntries: [],
			isRunning: false,
			totalDurationMs: 0,
			highlightedAlgorithm: null,
		});
	},

	clearSelection: () => {
		set({
			selectedAlgorithms: [],
			selectedSeedStrategies: [],
			selectedSubgraphStrategies: [],
			selectedMIVariants: [],
			selectedRankingAlgorithms: [],
		});
	},
}));
