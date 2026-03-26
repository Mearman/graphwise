import { useRef } from "react";
import { Box } from "@mantine/core";
import { useCytoscape } from "./use-cytoscape";
import { useGraphSync } from "./use-graph-sync";
import { useFrameSync } from "./use-frame-sync";
import { useDiscoveryOverlay } from "./use-discovery-overlay";
import { useGraphStore } from "../../state/graph-store";
import * as styles from "./GraphCanvas.css";
import * as overlayStyles from "./discovery-overlay.css";

export type GraphCanvasProps = Record<string, never>;

export function GraphCanvas(_props: GraphCanvasProps): React.ReactElement {
	const graph = useGraphStore((state) => state.graph);
	const seeds = useGraphStore((state) => state.seeds);
	const { cy, containerRef, isReady } = useCytoscape();
	const overlayRef = useRef<HTMLDivElement | null>(null);

	useGraphSync({ cy, graph, seeds });
	useFrameSync({ cy });
	useDiscoveryOverlay({ cy, overlayRef });

	return (
		<Box className={styles.canvas} data-ready={isReady.toString()}>
			<Box
				ref={containerRef}
				className={styles.transition}
				style={{ position: "absolute", inset: 0 }}
			/>
			<Box ref={overlayRef} className={overlayStyles.overlayContainer} />
		</Box>
	);
}
