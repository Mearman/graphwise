import { type ReactNode } from "react";
import { Paper, Stack, Box } from "@mantine/core";
import type { Core } from "cytoscape";
import type { AdjacencyMapGraph } from "graphwise/graph";
import type { Seed } from "graphwise/expansion";
import { ColumnHeader } from "./ColumnHeader";
import { ColumnMetrics } from "./ColumnMetrics";
import { ColumnPathList } from "./ColumnPathList";
import { GraphToolbar } from "../graph/GraphToolbar";
import { useGraphStore } from "../../state/graph-store";
import { useColumnStore } from "../../state/column-store";
import { useFrameSync } from "../graph/use-frame-sync";
import { useGraphSync } from "../graph/use-graph-sync";
import { useCytoscape } from "../graph/use-cytoscape";
import * as styles from "../graph/GraphCanvas.css";

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
}

function ColumnGraph({
	columnId,
	graph,
	seeds,
	cy,
	containerRef,
	isReady,
}: ColumnGraphProps): ReactNode {
	const column = useColumnStore((state) =>
		state.columns.find((c) => c.id === columnId),
	);

	// Sync graph to this column's Cytoscape instance
	useGraphSync({ cy, graph, seeds });

	// Sync animation frames to this column's Cytoscape instance
	useFrameSync({
		cy,
		algorithmName: column?.expansionAlgorithm ?? undefined,
	});

	return (
		<Box
			ref={containerRef}
			className={styles.canvas}
			data-ready={isReady.toString()}
			style={{ minHeight: 250, flex: 1 }}
		/>
	);
}

export function PipelineColumn({ columnId }: PipelineColumnProps): ReactNode {
	const graph = useGraphStore((state) => state.graph);
	const seeds = useGraphStore((state) => state.seeds);
	const column = useColumnStore((state) =>
		state.columns.find((c) => c.id === columnId),
	);
	const { cy, containerRef, isReady } = useCytoscape();

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
				<GraphToolbar cy={cy} />

				<Paper style={{ aspectRatio: 1, position: "relative" }} withBorder>
					<ColumnGraph
						columnId={columnId}
						graph={graph}
						seeds={seeds}
						cy={cy}
						containerRef={containerRef}
						isReady={isReady}
					/>
				</Paper>

				<ColumnMetrics column={column} />

				<ColumnPathList paths={paths} cy={cy} />
			</Stack>
		</Paper>
	);
}
