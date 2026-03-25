import { useEffect, useRef } from "react";
import type { Core, NodeSingular } from "cytoscape";
import type { AdjacencyMapGraph } from "graphwise/graph";
import type { Seed } from "graphwise/expansion";
import { graphToCytoscapeElements } from "../../engine/graph-bridge";
import { createStyles, type RelaxedStylesheet } from "./cytoscape-styles";
import { useGraphStore } from "../../state/graph-store";
import { useLayoutStore } from "../../state/layout-store";
import type { NodePosition } from "../../state/layout-store";

function isNode(target: unknown): target is NodeSingular {
	return (
		typeof target === "object" &&
		target !== null &&
		"id" in target &&
		"position" in target
	);
}

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
	const updateNodePosition = useLayoutStore(
		(state) => state.updateNodePosition,
	);

	// Track which node is being dragged locally to prevent feedback loop
	const draggedNodeIdRef = useRef<string | null>(null);

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

	// Effect 3: Drag sync — propagate local drag to store
	useEffect(() => {
		if (!cy || !graph) {
			return;
		}

		const onDrag = (evt: cytoscape.EventObject): void => {
			if (!isNode(evt.target)) {
				return;
			}
			const node = evt.target;
			const nodeId = node.id();
			const pos = node.position();
			updateNodePosition(nodeId, { x: pos.x, y: pos.y });
		};

		const onDragStart = (evt: cytoscape.EventObject): void => {
			if (!isNode(evt.target)) {
				return;
			}
			const node = evt.target;
			draggedNodeIdRef.current = node.id();
		};

		const onDragFree = (): void => {
			draggedNodeIdRef.current = null;
		};

		cy.on("drag", "node", onDrag);
		cy.on("dragstart", "node", onDragStart);
		cy.on("dragfree", "node", onDragFree);

		return () => {
			cy.off("drag", "node", onDrag);
			cy.off("dragstart", "node", onDragStart);
			cy.off("dragfree", "node", onDragFree);
		};
	}, [cy, graph, updateNodePosition]);

	// Effect 4: Apply position updates from store (skip locally dragged node)
	useEffect(() => {
		if (!cy || !graph || !positions) {
			return;
		}
		if (layoutGraphVersion !== graphVersion) {
			return;
		}

		cy.nodes().forEach((node) => {
			const nodeId = node.id();
			// Skip the node being dragged locally to avoid feedback loop
			if (nodeId === draggedNodeIdRef.current) {
				return;
			}

			const newPos = positions.get(nodeId);
			if (newPos) {
				const currentPos = node.position();
				// Only update if position actually changed
				if (currentPos.x !== newPos.x || currentPos.y !== newPos.y) {
					node.position({ x: newPos.x, y: newPos.y });
				}
			}
		});
	}, [cy, graph, graphVersion, layoutGraphVersion, positions]);
}
