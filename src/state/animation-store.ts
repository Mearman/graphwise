import { create } from "zustand";
import type {
	ExpansionAnimationFrame,
	TimelineEvent,
	AnimationResult,
} from "../engine/frame-types";

interface AnimationState {
	/** All captured frames */
	readonly frames: readonly ExpansionAnimationFrame[];
	/** Timeline events (path discoveries, phase transitions, termination) */
	readonly events: readonly TimelineEvent[];
	/** Current frame index during playback */
	readonly currentFrameIndex: number;
	/** Whether animation is playing */
	readonly isPlaying: boolean;
	/** Playback speed multiplier (1 = normal, 2 = double, 0.5 = half) */
	readonly speed: number;
	/** The selected algorithm name */
	readonly algorithmName: string;

	/** Load frames from an animation result */
	readonly loadResult: (result: AnimationResult, algorithmName: string) => void;
	/** Set current frame index (for scrubbing) */
	readonly setFrame: (index: number) => void;
	/** Step forward one frame */
	readonly stepForward: () => void;
	/** Step backward one frame */
	readonly stepBackward: () => void;
	/** Toggle play/pause */
	readonly togglePlay: () => void;
	/** Set playback speed */
	readonly setSpeed: (speed: number) => void;
	/** Set playing state */
	readonly setPlaying: (isPlaying: boolean) => void;
	/** Reset animation */
	readonly reset: () => void;
	/** Get current frame */
	readonly currentFrame: () => ExpansionAnimationFrame | undefined;
}

export const useAnimationStore = create<AnimationState>()((set, get) => ({
	frames: [],
	events: [],
	currentFrameIndex: 0,
	isPlaying: false,
	speed: 1,
	algorithmName: "",

	loadResult: (result, algorithmName) => {
		set({
			frames: result.frames,
			events: result.events,
			currentFrameIndex: 0,
			isPlaying: false,
			algorithmName,
		});
	},

	setFrame: (index) => {
		const { frames } = get();
		if (index >= 0 && index < frames.length) {
			set({ currentFrameIndex: index });
		}
	},

	stepForward: () => {
		const { currentFrameIndex, frames } = get();
		if (currentFrameIndex < frames.length - 1) {
			set({ currentFrameIndex: currentFrameIndex + 1 });
		} else {
			set({ isPlaying: false });
		}
	},

	stepBackward: () => {
		const { currentFrameIndex } = get();
		if (currentFrameIndex > 0) {
			set({ currentFrameIndex: currentFrameIndex - 1 });
		}
	},

	togglePlay: () => {
		const { isPlaying } = get();
		set({ isPlaying: !isPlaying });
	},

	setSpeed: (speed) => {
		set({ speed });
	},

	setPlaying: (isPlaying) => {
		set({ isPlaying });
	},

	reset: () => {
		set({
			frames: [],
			events: [],
			currentFrameIndex: 0,
			isPlaying: false,
			algorithmName: "",
		});
	},

	currentFrame: () => {
		const { frames, currentFrameIndex } = get();
		const frame = frames[currentFrameIndex];
		return frame;
	},
}));
