import { useEffect } from "react";
import type { Core, NodeSingular } from "cytoscape";
import { useAnimationStore } from "../../state/animation-store";
import { useInteractionStore } from "../../state/interaction-store";

export interface UseFrameSyncOptions {
	readonly cy: Core | null;
	readonly algorithmName?: string | undefined;
}

/** Type guard to check if a value is a string */
function isString(value: unknown): value is string {
	return typeof value === "string";
}

/** Safely convert unknown to string, returning fallback if not a string */
function asString(value: unknown, fallback: string): string {
	return isString(value) ? value : fallback;
}

/** Safely convert unknown to string, returning undefined if not a string */
function asStringOrUndefined(value: unknown): string | undefined {
	return isString(value) ? value : undefined;
}

/** Safely extract string data from a node, returning fallback if not a string */
function getNodeDataAsString(
	node: NodeSingular,
	key: string,
	fallback: string,
): string {
	return asString(node.data(key), fallback);
}

/** Safely extract original label from node, returning undefined if not a string */
function getOriginalLabel(node: NodeSingular): string | undefined {
	return asStringOrUndefined(node.data("originalLabel"));
}

export function useFrameSync(options: UseFrameSyncOptions): void {
	const { cy, algorithmName } = options;
	const showDiscoveryNumbers = useInteractionStore(
		(state) => state.showDiscoveryNumbers,
	);

	const currentFrame = useAnimationStore((state) => {
		if (algorithmName !== undefined && algorithmName !== "") {
			const framesForAlgo = state.algorithmFrames[algorithmName] ?? [];
			if (framesForAlgo.length === 0) return undefined;

			const idx =
				typeof state.syncedFrameIndex === "number"
					? state.syncedFrameIndex
					: state.currentFrameIndex;

			// Clamp index to array bounds - show final frame when synced index exceeds frame count
			const clampedIdx = Math.min(idx, framesForAlgo.length - 1);
			return framesForAlgo[clampedIdx];
		}
		return state.currentFrame();
	});

	useEffect(() => {
		if (!cy || !currentFrame) {
			// Reset all styling when no frame
			cy?.nodes().removeClass(["visited", "frontier", "expanded"]);
			cy?.edges().removeClass(["visited"]);
			return;
		}

		const { visitedNodes, expandedNode, frontierQueues } = currentFrame;

		// Clear previous frame styling
		cy.nodes().removeClass(["visited", "frontier", "expanded"]);
		cy.edges().removeClass(["visited"]);

		// Apply visited styling
		for (const [nodeId] of visitedNodes) {
			cy.getElementById(nodeId).addClass("visited");
		}

		// Apply frontier styling - nodes in any frontier queue
		const frontierNodeIds = new Set<string>();
		for (const queue of frontierQueues) {
			for (const nodeId of queue) {
				frontierNodeIds.add(nodeId);
			}
		}
		for (const nodeId of frontierNodeIds) {
			cy.getElementById(nodeId).addClass("frontier");
		}

		// Highlight the expanded node
		if (expandedNode) {
			cy.getElementById(expandedNode).addClass("expanded");
		}

		// Highlight edges connected to visited nodes
		for (const [nodeId] of visitedNodes) {
			const node = cy.getElementById(nodeId);
			const connectedEdges = node.connectedEdges();
			for (const edge of connectedEdges) {
				const source = edge.source().id();
				const target = edge.target().id();
				// Only highlight if both endpoints are visited
				if (visitedNodes.has(source) && visitedNodes.has(target)) {
					edge.addClass("visited");
				}
			}
		}

		// Handle discovery number labels
		if (showDiscoveryNumbers) {
			// Store original labels and set discovery numbers
			cy.nodes().forEach((node) => {
				const nodeId = node.id();
				// Store original label if not already stored
				if (getOriginalLabel(node) === undefined) {
					node.data(
						"originalLabel",
						getNodeDataAsString(node, "label", nodeId),
					);
				}
				// Set discovery number if visited
				const discoveryFrame = visitedNodes.get(nodeId);
				if (discoveryFrame !== undefined) {
					// Combine original label with discovery number
					const originalLabel = getOriginalLabel(node);
					const labelBase = originalLabel ?? nodeId;
					node.data("label", `${labelBase} (${String(discoveryFrame)})`);
				}
			});
		} else {
			// Restore original labels
			cy.nodes().forEach((node) => {
				const originalLabel = getOriginalLabel(node);
				if (originalLabel !== undefined) {
					node.data("label", originalLabel);
					node.removeData("originalLabel");
				}
			});
		}
	}, [cy, currentFrame, algorithmName, showDiscoveryNumbers]);
}
