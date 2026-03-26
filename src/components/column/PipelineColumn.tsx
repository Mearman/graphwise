import { type ReactNode, useRef } from "react";
import { Paper, Stack, Box } from "@mantine/core";
import type { Core } from "cytoscape";
import type { AdjacencyMapGraph } from "graphwise/graph";
import type { Seed } from "graphwise/expansion";
import { ColumnHeader } from "./ColumnHeader";
import { ColumnMetrics } from "./ColumnMetrics";
import { ColumnPathList } from "./ColumnPathList";
import { useGraphStore } from "../../state/graph-store";
import { useColumnStore } from "../../state/column-store";
import { useFrameSync } from "../graph/use-frame-sync";
import { useGraphSync } from "../graph/use-graph-sync";
import { useCytoscape } from "../graph/use-cytoscape";
import { useDiscoveryOverlay } from "../graph/use-discovery-overlay";
import { useCytoscapeTheme } from "../graph/use-cytoscape-theme";
import * as styles from "../graph/GraphCanvas.css";
import * as overlayStyles from "../graph/discovery-overlay.css";

interface PipelineColumnProps {
	readonly columnId: string;
}

interface ColumnGraphProps {
	readonly columnId: string;
	readonly graph: AdjacencyMapGraph | null;
	readonly seeds: readonly Seed[];
	readonly cy: Core | null;
	readonly containerRef: React.RefObject<HTMLDivElement | null>;
	readonly isReady: boolean;
	readonly directed: boolean;
}

function ColumnGraph({
	columnId,
	graph,
	seeds,
	cy,
	containerRef,
	isReady,
	directed,
}: ColumnGraphProps): ReactNode {
	const column = useColumnStore((state) =>
		state.columns.find((c) => c.id === columnId),
	);
	const overlayRef = useRef<HTMLDivElement | null>(null);

	// Sync graph to this column's Cytoscape instance
	useGraphSync({ cy, graph, seeds });

	// Sync animation frames to this column's Cytoscape instance
	useFrameSync({
		cy,
		algorithmName: column?.expansionAlgorithm ?? undefined,
	});

	// Overlay discovery numbers at node centres
	useDiscoveryOverlay({
		cy,
		overlayRef,
		algorithmName: column?.expansionAlgorithm ?? undefined,
	});

	// Apply theme-aware styles
	useCytoscapeTheme({ cy, directed });

	return (
		<Box className={styles.canvas} data-ready={isReady.toString()}>
			<Box ref={containerRef} style={{ position: "absolute", inset: 0 }} />
			<Box ref={overlayRef} className={overlayStyles.overlayContainer} />
		</Box>
	);
}

export function PipelineColumn({ columnId }: PipelineColumnProps): ReactNode {
	const graph = useGraphStore((state) => state.graph);
	const seeds = useGraphStore((state) => state.seeds);
	const directed = useGraphStore((state) => state.directed);
	const column = useColumnStore((state) =>
		state.columns.find((c) => c.id === columnId),
	);
	const { cy, containerRef, isReady } = useCytoscape(columnId);

	if (!column) {
		return null;
	}

	const paths = column.rankingResult?.paths ?? [];

	return (
		<Paper
			shadow="sm"
			withBorder
			p="sm"
			style={{
				display: "flex",
				flexDirection: "column",
			}}
		>
			<Stack gap="sm">
				<ColumnHeader column={column} />

				<Paper
					style={{
						aspectRatio: 1,
						position: "relative",
						width: "100%",
						overflow: "hidden",
					}}
					withBorder
				>
					<ColumnGraph
						columnId={columnId}
						graph={graph}
						seeds={seeds}
						cy={cy}
						containerRef={containerRef}
						isReady={isReady}
						directed={directed}
					/>
				</Paper>

				<ColumnMetrics column={column} />

				<ColumnPathList paths={paths} cy={cy} />
			</Stack>
		</Paper>
	);
}
