import { useEffect } from "react";
import type { Core } from "cytoscape";
import { useAnimationStore } from "../../state/animation-store";

export interface UseFrameSyncOptions {
	readonly cy: Core | null;
	readonly algorithmName?: string | undefined;
}

export function useFrameSync(options: UseFrameSyncOptions): void {
	const { cy, algorithmName } = options;

	const currentFrame = useAnimationStore((state) => {
		if (algorithmName !== undefined && algorithmName !== "") {
			const framesForAlgo = state.algorithmFrames[algorithmName] ?? [];
			const idx =
				typeof state.syncedFrameIndex === "number"
					? state.syncedFrameIndex
					: state.currentFrameIndex;
			return framesForAlgo[idx];
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
	}, [cy, currentFrame, algorithmName]);
}
