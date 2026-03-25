import { useEffect } from "react";
import type { Core } from "cytoscape";
import type { AdjacencyMapGraph } from "graphwise/graph";
import type { Seed } from "graphwise/expansion";
import { graphToCytoscapeElements } from "../../engine/graph-bridge";
import { createStyles } from "./cytoscape-styles";

export interface UseGraphSyncOptions {
	readonly cy: Core | null;
	readonly graph: AdjacencyMapGraph | null;
	readonly seeds: readonly Seed[];
}

export function useGraphSync(options: UseGraphSyncOptions): void {
	const { cy, graph, seeds } = options;

	useEffect(() => {
		if (!cy || !graph) {
			return;
		}

		const elements = graphToCytoscapeElements(graph, seeds);

		cy.elements().remove();
		cy.add([...elements.nodes]);
		cy.add([...elements.edges]);

		// Apply styles - cy.style() accepts unknown[] for JSON stylesheet blocks
		// Apply styles - cytoscape expects mutable array, so spread readonly result
		cy.style([...createStyles(graph.directed)]);

		cy.layout({
			name: "cose",
			animate: true,
			animationDuration: 300,
			fit: true,
			padding: 50,
		}).run();
	}, [cy, graph, seeds]);
}
