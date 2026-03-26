import { type ReactNode, useEffect } from "react";
import { Box } from "@mantine/core";
import type { Core } from "cytoscape";
import { useCytoscape } from "../graph/use-cytoscape";
import { useGraphSync } from "../graph/use-graph-sync";
import { useGraphStore } from "../../state/graph-store";
import { useAnimationStore } from "../../state/animation-store";
import { useColumnStore } from "../../state/column-store";
import * as styles from "../graph/GraphCanvas.css";

function mergeAlgorithmFrames(
	columns: ReturnType<typeof useColumnStore.getState>["columns"],
	syncedFrameIndex: number,
	animationStore: ReturnType<typeof useAnimationStore.getState>,
): Map<string, Set<string>> {
	const nodesByAlgo = new Map<string, Set<string>>();

	for (let algoIndex = 0; algoIndex < columns.length; algoIndex++) {
		const column = columns[algoIndex];
		if (column?.expansionAlgorithm === null || !column) continue;

		const framesForAlgo =
			animationStore.algorithmFrames[column.expansionAlgorithm] ?? [];
		if (framesForAlgo.length === 0) continue;

		// Clamp frame index to array bounds
		const clampedIdx = Math.min(syncedFrameIndex, framesForAlgo.length - 1);
		const frame = framesForAlgo[clampedIdx];

		if (!frame) continue;

		// Collect all visited nodes for this algorithm
		const algoKey = `${String(algoIndex)}:${column.expansionAlgorithm}`;
		const visitedNodes = new Set<string>();
		for (const [nodeId] of frame.visitedNodes) {
			visitedNodes.add(nodeId);
		}
		nodesByAlgo.set(algoKey, visitedNodes);
	}

	return nodesByAlgo;
}

function applyOverlayStyles(
	cy: Core,
	columns: ReturnType<typeof useColumnStore.getState>["columns"],
	nodesByAlgo: Map<string, Set<string>>,
): void {
	// Clear all algorithm-specific classes
	cy.nodes().removeClass(["visited", "frontier", "expanded", "novel-unique"]);
	cy.edges().removeClass(["visited-edge"]);

	// Remove all algo-index attributes
	cy.nodes().removeData("algo-index");
	cy.edges().removeData("algo-index");

	// Apply per-algorithm styling
	for (let algoIndex = 0; algoIndex < columns.length; algoIndex++) {
		const column = columns[algoIndex];
		if (column?.expansionAlgorithm === null || !column) continue;

		const algoKey = `${String(algoIndex)}:${column.expansionAlgorithm}`;
		const visitedNodes = nodesByAlgo.get(algoKey);
		if (!visitedNodes || visitedNodes.size === 0) continue;

		// Mark nodes with algo-index attribute for CSS selector
		for (const nodeId of visitedNodes) {
			cy.getElementById(nodeId).data("algo-index", String(algoIndex));
			cy.getElementById(nodeId).addClass("visited");
		}

		// Mark edges between visited nodes
		for (const source of visitedNodes) {
			const node = cy.getElementById(source);
			const connectedEdges = node.connectedEdges();
			for (const edge of connectedEdges) {
				const target = edge.target().id();
				if (visitedNodes.has(target)) {
					edge.data("algo-index", String(algoIndex));
					edge.addClass("visited-edge");
				}
			}
		}
	}
}

export function OverlayCanvas(): ReactNode {
	const graph = useGraphStore((state) => state.graph);
	const seeds = useGraphStore((state) => state.seeds);
	const columns = useColumnStore((state) => state.columns);
	const syncedFrameIndex = useAnimationStore((state) => state.syncedFrameIndex);
	const animationStore = useAnimationStore((state) => state);

	const { cy, containerRef, isReady } = useCytoscape("overlay");

	// Sync base graph
	useGraphSync({ cy, graph, seeds });

	// Merge and apply algorithm frames
	useEffect(() => {
		if (!cy || columns.length === 0) return;

		const nodesByAlgo = mergeAlgorithmFrames(
			columns,
			syncedFrameIndex,
			animationStore,
		);
		applyOverlayStyles(cy, columns, nodesByAlgo);
	}, [cy, columns, syncedFrameIndex, animationStore]);

	return (
		<Box
			ref={containerRef}
			className={styles.canvas}
			data-ready={isReady.toString()}
			style={{ minHeight: 400, flex: 1 }}
		/>
	);
}
