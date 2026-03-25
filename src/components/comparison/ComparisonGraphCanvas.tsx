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

interface ComparisonTileProps {
	readonly algorithmName: ExpansionAlgorithmName | undefined;
	readonly tileIndex: number;
	readonly color: string;
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

function getTileColor(tileIndex: number): string {
	return PALETTE[tileIndex % PALETTE.length] ?? "#64748b";
}

function getTileChip(tileIndex: number): string {
	return `#${String(tileIndex + 1)}`;
}

function ComparisonTile({
	algorithmName,
	tileIndex,
	color,
}: ComparisonTileProps): React.ReactElement {
	const cyto = useCytoscape();
	const graph = useGraphStore((s) => s.graph);
	const seeds = useGraphStore((s) => s.seeds);

	const label = algorithmName
		? (getAlgorithm(algorithmName)?.label ?? algorithmName)
		: "No algorithm selected";

	useGraphSync({
		cy: cyto.cy,
		graph,
		seeds,
		extraStyles: makeAlgoStyles(color, graph.directed),
	});
	useFrameSync({ cy: cyto.cy, algorithmName });

	return (
		<div style={{ position: "relative", minHeight: 0, height: "100%" }}>
			<Box
				ref={cyto.containerRef}
				className={`${styles.canvas} ${styles.transition}`}
				data-ready={cyto.isReady.toString()}
				style={{ width: "100%", height: "100%" }}
			/>
			<Group
				gap={6}
				style={{ position: "absolute", top: 8, left: 8, zIndex: 5 }}
			>
				<Badge size="xs" variant="filled" style={{ backgroundColor: color }}>
					{getTileChip(tileIndex)}
				</Badge>
				<Text size="xs" fw={600} c="white">
					{label}
				</Text>
			</Group>
		</div>
	);
}

export function ComparisonGraphCanvas({
	algorithms,
}: ComparisonGraphCanvasProps): React.ReactElement {
	const selectedAlgorithms = useComparisonStore((s) => s.selectedAlgorithms);
	const algos = algorithms ?? selectedAlgorithms;
	const hasVisualCompare = algos.length >= 2;
	const visualTiles: readonly (ExpansionAlgorithmName | undefined)[] =
		algos.length > 0 ? algos : [undefined];

	return (
		<div style={{ position: "relative", height: "100%", minHeight: 0 }}>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
					gap: 12,
					height: "100%",
					minHeight: 0,
				}}
			>
				{visualTiles.map((algorithmName, tileIndex) => (
					<div
						key={algorithmName ?? `empty-${String(tileIndex)}`}
						style={{ minHeight: 220, height: "100%" }}
					>
						<ComparisonTile
							algorithmName={algorithmName}
							tileIndex={tileIndex}
							color={getTileColor(tileIndex)}
						/>
					</div>
				))}
			</div>

			{!hasVisualCompare ? (
				<Badge
					size="xs"
					variant="light"
					color="gray"
					style={{ position: "absolute", top: 8, right: 8, zIndex: 6 }}
				>
					Select 2+ algorithms for visual compare
				</Badge>
			) : null}

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
