import { useEffect } from "react";
import type { Core } from "cytoscape";
import type { AdjacencyMapGraph } from "graphwise/graph";
import type { Seed } from "graphwise/expansion";
import { graphToCytoscapeElements } from "../../engine/graph-bridge";
import { createStyles, type RelaxedStylesheet } from "./cytoscape-styles";

export interface UseGraphSyncOptions {
	readonly cy: Core | null;
	readonly graph: AdjacencyMapGraph | null;
	readonly seeds: readonly Seed[];
	readonly extraStyles?: readonly RelaxedStylesheet[];
}

export function useGraphSync(options: UseGraphSyncOptions): void {
	const { cy, graph, seeds, extraStyles } = options;

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

		cy.layout({
			name: "cose",
			animate: true,
			animationDuration: 300,
			fit: true,
			padding: 50,
		}).run();
	}, [cy, graph, seeds, extraStyles]);
}
