import { useEffect, useRef } from "react";
import type { Core, NodeSingular, ShapedLayoutOptions } from "cytoscape";

/** fCoSE layout options (cytoscape-fcose has no bundled types). */
interface FcoseLayoutOptions extends ShapedLayoutOptions {
	readonly quality?: string;
	readonly randomize?: boolean;
	readonly nodeRepulsion?: number;
	readonly idealEdgeLength?: number;
	readonly edgeElasticity?: number;
	readonly gravity?: number;
	readonly gravityRange?: number;
	readonly numIter?: number;
	readonly nodeSeparation?: number;
}
import type { AdjacencyMapGraph } from "graphwise/graph";
import type { Seed } from "graphwise/expansion";
import { graphToCytoscapeElements } from "../../engine/graph-bridge";
import { createStyles, type RelaxedStylesheet } from "./cytoscape-styles";
import { useGraphStore } from "../../state/graph-store";
import { useLayoutStore } from "../../state/layout-store";
import type { NodePosition } from "../../state/layout-store";
import { useInteractionStore } from "../../state/interaction-store";

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
	const sharedViewport = useLayoutStore((state) => state.viewport);
	const setViewport = useLayoutStore((state) => state.setViewport);
	const zoomEnabled = useInteractionStore((state) => state.zoomEnabled);
	const panEnabled = useInteractionStore((state) => state.panEnabled);

	// Track which node is being dragged locally to prevent feedback loop
	const draggedNodeIdRef = useRef<string | null>(null);
	// Track when user is actively interacting (dragging) to pause viewport sync
	const isInteractingRef = useRef(false);

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
			// Positions are stale or missing — pre-position nodes then run fCoSE.
			// randomize: false means fCoSE starts from existing positions rather than
			// its own spectral stage, so we must set deterministic initial positions first.
			const allNodes = cy.nodes();
			const nodeCount = allNodes.length;
			const radius = Math.max(80, nodeCount * 12);

			// BFS-order placement: topology-close nodes start close on the circle
			// so fCoSE only needs small adjustments rather than large migrations.
			const visited = new Set<string>();
			const bfsOrder: string[] = [];
			const startNodeResult = allNodes.max((node) => node.degree(false));
			const startNodeId = startNodeResult.ele.id();
			const queue: string[] = [startNodeId];
			visited.add(startNodeId);
			while (queue.length > 0) {
				const current = queue.shift();
				if (current === undefined) break;
				bfsOrder.push(current);
				cy.getElementById(current)
					.neighborhood("node")
					.forEach((neighbour) => {
						const nId = neighbour.id();
						if (!visited.has(nId)) {
							visited.add(nId);
							queue.push(nId);
						}
					});
			}
			// Include unreachable nodes (disconnected components)
			allNodes.forEach((node) => {
				if (!visited.has(node.id())) {
					bfsOrder.push(node.id());
				}
			});
			bfsOrder.forEach((nodeId, i) => {
				const angle = (2 * Math.PI * i) / nodeCount;
				cy.getElementById(nodeId).position({
					x: radius * Math.cos(angle),
					y: radius * Math.sin(angle),
				});
			});

			const fcoseOptions: FcoseLayoutOptions = {
				name: "fcose",
				quality: "proof",
				randomize: false,
				animate: true,
				animationDuration: 500,
				fit: true,
				padding: 60,
				nodeDimensionsIncludeLabels: true,
				// Edge springs dominate repulsion for topology-aware clustering.
				// Short ideal length + strong elasticity keeps edges compact.
				nodeRepulsion: 4500,
				idealEdgeLength: 50,
				edgeElasticity: 0.65,
				gravity: 0.4,
				gravityRange: 3.8,
				numIter: 3000,
				nodeSeparation: 75,
			};
			const layout = cy.layout(fcoseOptions);

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
			isInteractingRef.current = true;
		};

		const onDragFree = (): void => {
			draggedNodeIdRef.current = null;
			isInteractingRef.current = false;
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

	// Effect 5: Viewport sync — propagate local viewport changes to store
	useEffect(() => {
		if (!cy || !graph) {
			return;
		}

		const onViewport = (): void => {
			// Don't sync while actively dragging a node
			if (isInteractingRef.current) {
				return;
			}
			const zoom = cy.zoom();
			const pan = cy.pan();
			setViewport({ zoom, pan: { x: pan.x, y: pan.y } });
		};

		cy.on("viewport", onViewport);

		return () => {
			cy.off("viewport", onViewport);
		};
	}, [cy, graph, setViewport]);

	// Effect 6: Apply viewport updates from store
	useEffect(() => {
		if (!cy || !graph || !sharedViewport) {
			return;
		}

		// Don't apply while user is interacting with this instance
		if (isInteractingRef.current) {
			return;
		}

		const currentZoom = cy.zoom();
		const currentPan = cy.pan();
		const zoomChanged = currentZoom !== sharedViewport.zoom;
		const panChanged =
			currentPan.x !== sharedViewport.pan.x ||
			currentPan.y !== sharedViewport.pan.y;

		if (zoomChanged || panChanged) {
			cy.viewport({
				zoom: sharedViewport.zoom,
				pan: { x: sharedViewport.pan.x, y: sharedViewport.pan.y },
			});
		}
	}, [cy, graph, sharedViewport]);

	// Effect 7: Apply interaction settings from store
	useEffect(() => {
		if (!cy) {
			return;
		}
		cy.userZoomingEnabled(zoomEnabled);
		cy.userPanningEnabled(panEnabled);
	}, [cy, zoomEnabled, panEnabled]);
}
