import { useEffect, type RefObject } from "react";
import type { Core, NodeSingular } from "cytoscape";
import { useInteractionStore } from "../../state/interaction-store";
import { useAnimationStore } from "../../state/animation-store";
import * as styles from "./discovery-overlay.css";

export interface UseDiscoveryOverlayOptions {
	readonly cy: Core | null;
	readonly overlayRef: RefObject<HTMLDivElement | null>;
	readonly algorithmName?: string | undefined;
}

export function useDiscoveryOverlay(options: UseDiscoveryOverlayOptions): void {
	const { cy, overlayRef, algorithmName } = options;
	const showDiscoveryNumbers = useInteractionStore(
		(state) => state.showDiscoveryNumbers,
	);

	// Get the current frame for this algorithm (or the primary frame if no algorithm specified)
	const currentFrame = useAnimationStore((state) => {
		if (algorithmName !== undefined && algorithmName !== "") {
			const framesForAlgo = state.algorithmFrames[algorithmName] ?? [];
			if (framesForAlgo.length === 0) return undefined;

			const idx =
				typeof state.syncedFrameIndex === "number"
					? state.syncedFrameIndex
					: state.currentFrameIndex;

			// Clamp index to array bounds
			const clampedIdx = Math.min(idx, framesForAlgo.length - 1);
			return framesForAlgo[clampedIdx];
		}
		return state.currentFrame();
	});

	useEffect(() => {
		if (!cy || !overlayRef.current) {
			return;
		}

		const container = overlayRef.current;

		// If discovery numbers are disabled, clear the overlay
		if (!showDiscoveryNumbers) {
			container.replaceChildren();
			return;
		}

		const { visitedNodes } = currentFrame ?? { visitedNodes: new Map() };

		// Update function: position overlay elements at node centres
		const updatePositions = (): void => {
			container.replaceChildren();

			for (const [nodeId, discoveryFrame] of visitedNodes) {
				const node = cy.getElementById(String(nodeId));
				if (node.length === 0) continue;

				const pos = getRenderedPosition(node);
				const el = document.createElement("div");
				el.textContent = String(discoveryFrame);
				el.className = styles.discoveryNumber;
				el.style.transform = `translate(${String(pos.x)}px, ${String(pos.y)}px) translate(-50%, -50%)`;
				container.appendChild(el);
			}
		};

		// Listen to viewport changes
		cy.on("pan zoom render viewport", updatePositions);
		updatePositions();

		return () => {
			cy.off("pan zoom render viewport", updatePositions);
			container.replaceChildren();
		};
	}, [cy, overlayRef, showDiscoveryNumbers, currentFrame]);
}

/** Get rendered (screen) position for a node */
function getRenderedPosition(node: NodeSingular): { x: number; y: number } {
	const pos = node.renderedPosition();
	return { x: pos.x, y: pos.y };
}
