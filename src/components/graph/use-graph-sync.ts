import { useEffect } from "react";
import type { Core } from "cytoscape";
import type { AdjacencyMapGraph } from "graphwise/graph";
import type { Seed } from "graphwise/expansion";
import { graphToCytoscapeElements } from "../../engine/graph-bridge";
import { createStyles, type RelaxedStylesheet } from "./cytoscape-styles";
import { useGraphStore } from "../../state/graph-store";
import { useLayoutStore } from "../../state/layout-store";
import type { NodePosition } from "../../state/layout-store";

export interface UseGraphSyncOptions {
	readonly cy: Core | null;
	readonly graph: AdjacencyMapGraph | null;
	readonly seeds: readonly Seed[];
	readonly extraStyles?: readonly RelaxedStylesheet[];
}

export function useGraphSync(options: UseGraphSyncOptions): void {
	const { cy, graph, seeds, extraStyles } = options;

	const graphVersion = useGraphStore((state) => state.version);
	const layoutGraphVersion = useLayoutStore(
		(state) => state.layoutGraphVersion,
	);
	const positions = useLayoutStore((state) => state.positions);
	const setPositions = useLayoutStore((state) => state.setPositions);

	// Effect 1: Element sync — add/remove nodes and edges when graph changes
	useEffect(() => {
		if (!cy || !graph) {
			return;
		}

		const elements = graphToCytoscapeElements(graph, seeds);

		cy.elements().remove();
		cy.add([...elements.nodes]);
		cy.add([...elements.edges]);

		// Apply styles - cytoscape expects mutable array, so spread readonly result
		cy.style([...createStyles(graph.directed), ...(extraStyles ?? [])]);
	}, [cy, graph, seeds, extraStyles]);

	// Effect 2: Layout sync — apply shared positions or run CoSE
	useEffect(() => {
		if (!cy || !graph) {
			return;
		}

		const positionsValid =
			positions !== null && layoutGraphVersion === graphVersion;

		if (positionsValid) {
			// Positions are current for this graph version — apply as preset
			// Build a map: position data is read-only but layout positions param expects function
			const posMap = positions;
			const getPosition = (nodeId: string): NodePosition =>
				posMap.get(nodeId) ?? { x: 0, y: 0 };

			// Add position data to nodes before layout
			cy.nodes().forEach((node) => {
				const nodeId = node.id();
				const pos = getPosition(nodeId);
				node.position(pos);
			});

			// Apply preset layout with no animation
			cy.layout({
				name: "preset",
				animate: false,
				fit: true,
				padding: 50,
			}).run();
		} else {
			// Positions are stale or missing — run CoSE and store result
			const layout = cy.layout({
				name: "cose",
				randomize: false,
				animate: true,
				animationDuration: 300,
				fit: true,
				padding: 50,
			});

			layout.one("layoutstop", () => {
				const newPositions = new Map<string, NodePosition>();
				cy.nodes().forEach((node) => {
					const nodeId = node.id();
					newPositions.set(nodeId, { ...node.position() });
				});
				setPositions(graphVersion, newPositions);
			});

			layout.run();
		}
	}, [cy, graph, graphVersion, layoutGraphVersion, positions, setPositions]);
}
