import { useMemo } from "react";
import type { ExpansionAnimationFrame, TimelineEvent } from "./frame-types";
import { useAnimationStore } from "../state/animation-store";

export interface FrameCacheResult {
	readonly frames: readonly ExpansionAnimationFrame[];
	readonly currentFrame: ExpansionAnimationFrame | undefined;
	readonly totalFrames: number;
	readonly hasFrames: boolean;
	readonly currentFrameIndex: number;
	readonly frameEvents: readonly TimelineEvent[];
}

export function useFrameCache(): FrameCacheResult {
	const { frames, currentFrameIndex, events } = useAnimationStore();

	const currentFrame = useMemo(() => {
		return frames[currentFrameIndex];
	}, [frames, currentFrameIndex]);

	const totalFrames = frames.length;

	const hasFrames = totalFrames > 0;

	const frameEvents = useMemo(() => {
		return events.filter((event) => event.frameIndex <= currentFrameIndex);
	}, [events, currentFrameIndex]);

	return {
		frames,
		currentFrame,
		totalFrames,
		hasFrames,
		currentFrameIndex,
		frameEvents,
	};
}
