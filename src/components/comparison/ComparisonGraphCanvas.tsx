import React from "react";
import { Box, Badge, Group, Text } from "@mantine/core";
import { useCytoscape } from "../graph/use-cytoscape";
import { useGraphSync } from "../graph/use-graph-sync";
import { useFrameSync } from "../graph/use-frame-sync";
import { useGraphStore } from "../../state/graph-store";
import { useComparisonStore } from "../../state/comparison-store";
import * as styles from "../graph/GraphCanvas.css";
import {
	getAlgorithm,
	type ExpansionAlgorithmName,
} from "../../engine/algorithm-registry";
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
	// Current implementation remains 2-pane while stage-comparison model evolves.
	// The selection source now supports N algorithms and this component renders
	// the first two as the default visual side-by-side.
	const left = useCytoscape();
	const right = useCytoscape();

	const graph = useGraphStore((s) => s.graph);
	const seeds = useGraphStore((s) => s.seeds);
	const selectedAlgorithms = useComparisonStore((s) => s.selectedAlgorithms);
	const algos = algorithms ?? selectedAlgorithms;

	const leftAlgo = algos[0];
	const rightAlgo = algos[1];
	const leftLabel = leftAlgo
		? (getAlgorithm(leftAlgo)?.label ?? leftAlgo)
		: "A";
	const rightLabel = rightAlgo
		? (getAlgorithm(rightAlgo)?.label ?? rightAlgo)
		: "B";

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
			<div style={{ position: "relative", height: "100%" }}>
				<Box
					ref={left.containerRef}
					className={`${styles.canvas} ${styles.transition}`}
					data-ready={left.isReady.toString()}
				/>
				<Badge
					size="xs"
					variant="light"
					color="gray"
					style={{ position: "absolute", top: 8, left: 8, zIndex: 5 }}
				>
					Select 2+ algorithms for visual compare
				</Badge>
			</div>
		);
	}

	return (
		<div style={{ display: "flex", gap: 12, height: "100%", minHeight: 0 }}>
			<div style={{ width: "50%", position: "relative", minHeight: 0 }}>
				<Box
					ref={left.containerRef}
					className={`${styles.canvas} ${styles.transition}`}
					data-ready={left.isReady.toString()}
					style={{ width: "100%" }}
				/>
				<Group
					gap={6}
					style={{ position: "absolute", top: 8, left: 8, zIndex: 5 }}
				>
					<Badge size="xs" color="red" variant="filled">
						A
					</Badge>
					<Text size="xs" fw={600} c="white">
						{leftLabel}
					</Text>
				</Group>
			</div>
			<div style={{ width: "50%", position: "relative", minHeight: 0 }}>
				<Box
					ref={right.containerRef}
					className={`${styles.canvas} ${styles.transition}`}
					data-ready={right.isReady.toString()}
					style={{ width: "100%" }}
				/>
				<Group
					gap={6}
					style={{ position: "absolute", top: 8, left: 8, zIndex: 5 }}
				>
					<Badge size="xs" color="blue" variant="filled">
						B
					</Badge>
					<Text size="xs" fw={600} c="white">
						{rightLabel}
					</Text>
				</Group>
			</div>
			<Badge
				size="sm"
				variant="light"
				color="gray"
				style={{
					position: "absolute",
					top: 8,
					left: "50%",
					transform: "translateX(-50%)",
					zIndex: 5,
				}}
			>
				Expansion Stage Visual Compare
			</Badge>
		</div>
	);
}
