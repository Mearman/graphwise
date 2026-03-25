import { create } from "zustand";
import type { ExpansionResult } from "graphwise/expansion";
import type { PARSEResult } from "graphwise/ranking";
import type { MIVariantName } from "graphwise/ranking/mi";
import type { ExpansionAlgorithmName } from "../engine/algorithm-registry";

/** Pipeline stage identifiers */
export type PipelineStage = 1 | 2 | 3;

function isPipelineStage(value: number): value is PipelineStage {
	const stages: readonly number[] = [1, 2, 3];
	return stages.includes(value);
}

const DEFAULT_MI_VARIANT: MIVariantName = "jaccard";

interface PipelineState {
	/** Which pipeline stage is active/expanded */
	readonly activeStage: PipelineStage;
	/** The primary algorithm for animation playback */
	readonly primaryAlgorithm: ExpansionAlgorithmName | null;
	/** Algorithms selected for batch comparison */
	readonly comparisonAlgorithms: readonly ExpansionAlgorithmName[];
	/** Selected MI variant for PARSE ranking */
	readonly selectedMIVariant: MIVariantName;
	/** The expansion result (shared across components) */
	readonly expansionResult: ExpansionResult | null;
	/** The ranking result from PARSE */
	readonly rankingResult: PARSEResult | null;
	/** Whether expansion is running */
	readonly isExpansionRunning: boolean;
	/** Whether ranking is running */
	readonly isRankingRunning: boolean;

	// Actions
	/** Set the active pipeline stage */
	readonly setActiveStage: (stage: PipelineStage) => void;
	/** Advance to the next pipeline stage */
	readonly advanceStage: () => void;
	/** Set the primary algorithm for animation */
	readonly setPrimaryAlgorithm: (name: ExpansionAlgorithmName | null) => void;
	/** Toggle an algorithm in the comparison set */
	readonly toggleComparisonAlgorithm: (name: ExpansionAlgorithmName) => void;
	/** Set the selected MI variant */
	readonly setSelectedMIVariant: (variant: MIVariantName) => void;
	/** Set the expansion result */
	readonly setExpansionResult: (result: ExpansionResult | null) => void;
	/** Set the ranking result */
	readonly setRankingResult: (result: PARSEResult | null) => void;
	/** Set expansion running state */
	readonly setExpansionRunning: (running: boolean) => void;
	/** Set ranking running state */
	readonly setRankingRunning: (running: boolean) => void;
	/** Reset all pipeline state */
	readonly reset: () => void;
	/** Reset only expansion-related state (when seeds change) */
	readonly resetExpansion: () => void;
	/** Reset only ranking-related state (when algorithm changes) */
	readonly resetRanking: () => void;
}

const INITIAL_STATE: {
	readonly activeStage: PipelineStage;
	readonly primaryAlgorithm: ExpansionAlgorithmName | null;
	readonly comparisonAlgorithms: readonly ExpansionAlgorithmName[];
	readonly selectedMIVariant: MIVariantName;
	readonly expansionResult: ExpansionResult | null;
	readonly rankingResult: PARSEResult | null;
	readonly isExpansionRunning: boolean;
	readonly isRankingRunning: boolean;
} = {
	activeStage: 1,
	primaryAlgorithm: null,
	comparisonAlgorithms: [],
	selectedMIVariant: DEFAULT_MI_VARIANT,
	expansionResult: null,
	rankingResult: null,
	isExpansionRunning: false,
	isRankingRunning: false,
};

export const usePipelineStore = create<PipelineState>()((set, get) => ({
	...INITIAL_STATE,

	setActiveStage: (stage) => {
		set({ activeStage: stage });
	},

	advanceStage: () => {
		const { activeStage } = get();
		const nextStage = activeStage + 1;
		if (isPipelineStage(nextStage)) {
			set({ activeStage: nextStage });
		}
	},

	setPrimaryAlgorithm: (name) => {
		set({ primaryAlgorithm: name, rankingResult: null });
	},

	toggleComparisonAlgorithm: (name) => {
		const { comparisonAlgorithms } = get();
		if (comparisonAlgorithms.includes(name)) {
			set({
				comparisonAlgorithms: comparisonAlgorithms.filter((a) => a !== name),
			});
		} else {
			set({
				comparisonAlgorithms: [...comparisonAlgorithms, name],
			});
		}
	},

	setSelectedMIVariant: (variant) => {
		set({ selectedMIVariant: variant });
	},

	setExpansionResult: (result) => {
		set({
			expansionResult: result,
			rankingResult: null,
			isExpansionRunning: false,
		});
		// Auto-advance to ranking stage when expansion completes
		if (result !== null) {
			set({ activeStage: 3 });
		}
	},

	setRankingResult: (result) => {
		set({ rankingResult: result, isRankingRunning: false });
	},

	setExpansionRunning: (running) => {
		set({ isExpansionRunning: running });
	},

	setRankingRunning: (running) => {
		set({ isRankingRunning: running });
	},

	reset: () => {
		set(INITIAL_STATE);
	},

	resetExpansion: () => {
		set({
			expansionResult: null,
			rankingResult: null,
			activeStage: 2,
		});
	},

	resetRanking: () => {
		set({
			rankingResult: null,
		});
	},
}));
