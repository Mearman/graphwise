import { Box } from "@mantine/core";
import { useCytoscape } from "./use-cytoscape";
import { useGraphSync } from "./use-graph-sync";
import { useGraphStore } from "../../state/graph-store";
import * as styles from "./GraphCanvas.css";

export type GraphCanvasProps = Record<string, never>;

export function GraphCanvas(_props: GraphCanvasProps): React.ReactElement {
	const graph = useGraphStore((state) => state.graph);
	const seeds = useGraphStore((state) => state.seeds);
	const { cy, containerRef, isReady } = useCytoscape();

	useGraphSync({ cy, graph, seeds });

	return (
		<Box
			ref={containerRef}
			className={`${styles.canvas} ${styles.transition}`}
			data-ready={isReady.toString()}
		/>
	);
}
