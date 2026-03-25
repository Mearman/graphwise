import { useEffect, useRef, useState } from "react";
import { useAnimationStore } from "../state/animation-store";
import type { ExpansionAnimationFrame } from "../engine/frame-types";

interface UseAnimationReturn {
	readonly currentFrame: ExpansionAnimationFrame | null;
	readonly currentFrameIndex: number;
	readonly isPlaying: boolean;
	readonly speed: number;
	readonly play: () => void;
	readonly pause: () => void;
	readonly toggle: () => void;
	readonly step: (direction: "forward" | "backward") => void;
	readonly reset: () => void;
	readonly setSpeed: (speed: number) => void;
}

/**
 * Hook managing animation playback state: current frame, play/pause, speed.
 * Drives requestAnimationFrame loop when playing.
 */
export function useAnimation(): UseAnimationReturn {
	const frames = useAnimationStore((state) => state.frames);
	const setFrame = useAnimationStore((state) => state.setFrame);

	const [isPlaying, setIsPlaying] = useState(false);
	const [speed, setSpeed] = useState(1);
	const frameIndexRef = useRef(0);
	const rafRef = useRef<number | null>(null);
	const lastFrameTimeRef = useRef(0);

	const currentFrame: ExpansionAnimationFrame | null =
		frameIndexRef.current < frames.length
			? (frames[frameIndexRef.current] ?? null)
			: null;

	// Animation loop
	useEffect(() => {
		if (!isPlaying || frames.length === 0) {
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = null;
			}
			return;
		}

		const tick = (now: number): void => {
			const deltaMs =
				lastFrameTimeRef.current === 0 ? 16 : now - lastFrameTimeRef.current;
			lastFrameTimeRef.current = now;

			// Frame duration: 100ms base / speed multiplier
			const frameDurationMs = 100 / speed;

			if (deltaMs >= frameDurationMs) {
				frameIndexRef.current = Math.min(
					frameIndexRef.current + 1,
					frames.length - 1,
				);
				setFrame(frameIndexRef.current);
				lastFrameTimeRef.current = now;

				// Auto-pause at end
				if (frameIndexRef.current >= frames.length - 1) {
					setIsPlaying(false);
				}
			}

			rafRef.current = requestAnimationFrame(tick);
		};

		rafRef.current = requestAnimationFrame(tick);

		return (): void => {
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = null;
			}
		};
	}, [isPlaying, speed, frames.length, setFrame]);

	const play = (): void => {
		setIsPlaying(true);
	};
	const pause = (): void => {
		setIsPlaying(false);
	};
	const toggle = (): void => {
		setIsPlaying((prev) => !prev);
	};

	const step = (direction: "forward" | "backward"): void => {
		pause();
		const newIndex = Math.max(
			0,
			Math.min(
				frameIndexRef.current + (direction === "forward" ? 1 : -1),
				frames.length - 1,
			),
		);
		frameIndexRef.current = newIndex;
		setFrame(newIndex);
	};

	const reset = (): void => {
		pause();
		frameIndexRef.current = 0;
		lastFrameTimeRef.current = 0;
		setFrame(0);
	};

	return {
		currentFrame,
		currentFrameIndex: frameIndexRef.current,
		isPlaying,
		speed,
		play,
		pause,
		toggle,
		step,
		reset,
		setSpeed,
	};
}
