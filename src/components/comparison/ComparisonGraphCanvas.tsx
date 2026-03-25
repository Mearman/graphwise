import React from "react";
import { Box } from "@mantine/core";
import { useCytoscape } from "../graph/use-cytoscape";
import { useGraphSync } from "../graph/use-graph-sync";
import { useFrameSync } from "../graph/use-frame-sync";
import { useGraphStore } from "../../state/graph-store";
import { useComparisonStore } from "../../state/comparison-store";
import * as styles from "../graph/GraphCanvas.css";
import type { ExpansionAlgorithmName } from "../../engine/algorithm-registry";
import type { RelaxedStylesheet } from "../graph/cytoscape-styles";

export interface ComparisonGraphCanvasProps {
	readonly algorithms?: readonly ExpansionAlgorithmName[];
}

const PALETTE = [
	"#ef4444",
	"#3b82f6",
	"#10b981",
	"#8b5cf6",
	"#f97316",
	"#ec4899",
];

function makeAlgoStyles(
	color: string,
	directed: boolean,
): readonly RelaxedStylesheet[] {
	return [
		{
			selector: "node.visited",
			style: { backgroundColor: color },
		},
		{
			selector: "node.frontier",
			style: { backgroundColor: color },
		},
		{
			selector: "node.expanded",
			style: { borderColor: color },
		},
		{
			selector: "edge.visited",
			style: {
				lineColor: color,
				width: 2,
				...(directed ? { targetArrowColor: color } : {}),
			},
		},
		{
			selector: "edge.highlighted",
			style: { lineColor: color, width: 3 },
		},
	];
}

export function ComparisonGraphCanvas({
	algorithms,
}: ComparisonGraphCanvasProps): React.ReactElement {
	const left = useCytoscape();
	const right = useCytoscape();

	const graph = useGraphStore((s) => s.graph);
	const seeds = useGraphStore((s) => s.seeds);
	const selectedAlgorithms = useComparisonStore((s) => s.selectedAlgorithms);
	const algos = algorithms ?? selectedAlgorithms;

	const leftAlgo = algos[0];
	const rightAlgo = algos[1];

	const leftColor: string = PALETTE[0] ?? "#ef4444";
	const rightColor: string = PALETTE[1] ?? "#3b82f6";

	// Apply graph and algorithm-specific styles per canvas.
	useGraphSync({
		cy: left.cy,
		graph,
		seeds,
		extraStyles: makeAlgoStyles(leftColor, graph.directed),
	});
	useGraphSync({
		cy: right.cy,
		graph,
		seeds,
		extraStyles: makeAlgoStyles(rightColor, graph.directed),
	});

	// Sync frames per algorithm
	useFrameSync({ cy: left.cy, algorithmName: leftAlgo });
	useFrameSync({ cy: right.cy, algorithmName: rightAlgo });

	// Fallback to a single canvas when fewer than 2 algorithms selected
	if (algos.length < 2) {
		return (
			<Box
				ref={left.containerRef}
				className={`${styles.canvas} ${styles.transition}`}
				data-ready={left.isReady.toString()}
			/>
		);
	}

	return (
		<div style={{ display: "flex", gap: 12, height: "100%" }}>
			<Box
				ref={left.containerRef}
				className={`${styles.canvas} ${styles.transition}`}
				data-ready={left.isReady.toString()}
				style={{ width: "50%" }}
			/>
			<Box
				ref={right.containerRef}
				className={`${styles.canvas} ${styles.transition}`}
				data-ready={right.isReady.toString()}
				style={{ width: "50%" }}
			/>
		</div>
	);
}
