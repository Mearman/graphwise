import { useEffect } from "react";
import { useAnimationStore } from "../state/animation-store";

/**
 * Hook that attaches keyboard event listeners for animation control.
 *
 * Supported keys:
 * - Space: Play/pause toggle
 * - Left arrow: Step backward (previous frame)
 * - Right arrow: Step forward (next frame)
 * - Escape: Reset to frame 0
 *
 * Only listens when focus is not on a text input or textarea.
 */
export function useKeyboard(): void {
	const togglePlay = useAnimationStore((state) => state.togglePlay);
	const stepForward = useAnimationStore((state) => state.stepForward);
	const stepBackward = useAnimationStore((state) => state.stepBackward);
	const setFrame = useAnimationStore((state) => state.setFrame);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent): void => {
			// Ignore if focus is on text input or textarea
			const target = event.target;
			if (
				target instanceof HTMLInputElement ||
				target instanceof HTMLTextAreaElement
			) {
				return;
			}

			switch (event.code) {
				case "Space": {
					event.preventDefault();
					togglePlay();
					break;
				}

				case "ArrowLeft": {
					event.preventDefault();
					stepBackward();
					break;
				}

				case "ArrowRight": {
					event.preventDefault();
					stepForward();
					break;
				}

				case "Escape": {
					event.preventDefault();
					setFrame(0);
					break;
				}
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [togglePlay, stepForward, stepBackward, setFrame]);
}
