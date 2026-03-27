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

/** Mulberry32 PRNG — fast, deterministic 32-bit seeded RNG. */
function mulberry32(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state + 0x6d2b9f6d) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
		t ^= (t + Math.imul(t ^ (t >>> 7), t | 61)) >>> 0;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

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

	// Effect 1: Element sync — rebuild elements when graph structure changes.
	// Seeds are excluded here and applied separately by Effect 1b so that seed
	// changes do not trigger a full remove/re-add (which resets node positions).
	useEffect(() => {
		if (!cy || !graph) {
			return;
		}

		const elements = graphToCytoscapeElements(graph, []);

		cy.elements().remove();
		cy.add([...elements.nodes]);
		cy.add([...elements.edges]);

		// Apply styles - cytoscape expects mutable array, so spread readonly result
		cy.style([...createStyles(graph.directed), ...(extraStyles ?? [])]);
	}, [cy, graph, extraStyles]);

	// Effect 1b: Seed role sync — update seedRole data on existing nodes without
	// rebuilding the element list (which would reset node positions).
	useEffect(() => {
		if (!cy || !graph) {
			return;
		}

		const seedMap = new Map<string, string>();
		for (const seed of seeds) {
			seedMap.set(seed.id, seed.role ?? "bidirectional");
		}

		cy.nodes().forEach((node) => {
			const role = seedMap.get(node.id()) ?? undefined;
			node.data("seedRole", role);
		});
	}, [cy, graph, seeds]);

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
			// Positions are stale or missing — run fCoSE with spectral initialisation.
			// fCoSE's spectral stage (randomize: true) uses Math.random() internally
			// with no seed API. Patch Math.random with a seeded PRNG for the duration
			// of the layout so the same graphVersion always produces the same layout.
			const origRandom = Math.random;
			Math.random = mulberry32(graphVersion);

			const n = graph.nodeCount;
			const fcoseOptions: FcoseLayoutOptions = {
				name: "fcose",
				quality: "proof",
				randomize: true,
				animate: true,
				animationDuration: 500,
				fit: true,
				padding: 60,
				nodeDimensionsIncludeLabels: true,
				nodeRepulsion: Math.max(4500, n * 200),
				idealEdgeLength: Math.max(50, Math.sqrt(n) * 12),
				edgeElasticity: 0.65,
				gravity: 0.4,
				gravityRange: 3.8,
				numIter: 3000,
				nodeSeparation: Math.max(75, n * 2),
			};
			const layout = cy.layout(fcoseOptions);

			layout.one("layoutstop", () => {
				Math.random = origRandom;
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
