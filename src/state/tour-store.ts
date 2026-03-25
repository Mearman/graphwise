import { create } from "zustand";

export type AppMode = "tour" | "explore";

interface TourState {
	/** Current app mode */
	readonly mode: AppMode;
	/** Current tour step (0-indexed, 10 steps total) */
	readonly currentStep: number;
	/** Total number of tour steps */
	readonly totalSteps: number;
	/** Whether tour auto-play is active */
	readonly isAutoPlaying: boolean;

	/** Set app mode */
	readonly setMode: (mode: AppMode) => void;
	/** Go to specific tour step */
	readonly goToStep: (step: number) => void;
	/** Next step */
	readonly nextStep: () => void;
	/** Previous step */
	readonly previousStep: () => void;
	/** Toggle auto-play */
	readonly toggleAutoPlay: () => void;
	/** Set auto-playing state */
	readonly setAutoPlaying: (isAutoPlaying: boolean) => void;
	/** Reset tour to beginning */
	readonly resetTour: () => void;
}

export const useTourStore = create<TourState>()((set, get) => ({
	mode: "tour",
	currentStep: 0,
	totalSteps: 10,
	isAutoPlaying: false,

	setMode: (mode) => {
		set({ mode });
	},

	goToStep: (step) => {
		const { totalSteps } = get();
		const clampedStep = Math.max(0, Math.min(step, totalSteps - 1));
		set({ currentStep: clampedStep });
	},

	nextStep: () => {
		const { currentStep, totalSteps } = get();
		if (currentStep < totalSteps - 1) {
			set({ currentStep: currentStep + 1 });
		} else {
			set({ isAutoPlaying: false });
		}
	},

	previousStep: () => {
		const { currentStep } = get();
		if (currentStep > 0) {
			set({ currentStep: currentStep - 1 });
		}
	},

	toggleAutoPlay: () => {
		const { isAutoPlaying } = get();
		set({ isAutoPlaying: !isAutoPlaying });
	},

	setAutoPlaying: (isAutoPlaying) => {
		set({ isAutoPlaying });
	},

	resetTour: () => {
		set({ currentStep: 0, isAutoPlaying: false });
	},
}));
