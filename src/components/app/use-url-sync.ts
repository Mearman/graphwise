import { useEffect, useRef } from "react";
import {
	deserialiseFromHash,
	updateHash,
	type SerialisedState,
	type SerialisedStateV2Type,
} from "../../state/url-state";
import { useGraphStore } from "../../state/graph-store";
import { useAnimationStore } from "../../state/animation-store";
import { useColumnStore } from "../../state/column-store";
import { useAppStore } from "../../state/app-store";
import { useGenerationStore } from "../../state/generation-store";
import { useInteractionStore } from "../../state/interaction-store";
import {
	expansionAlgorithmNames,
	rankingAlgorithmNames,
	type ExpansionAlgorithmName,
	type RankingAlgorithmName,
} from "../../engine/algorithm-registry";
import type { MIVariantName } from "graphwise/ranking/mi";
import { AdjacencyMapGraph } from "graphwise/graph";
import type { Seed, SeedRole } from "graphwise/expansion";

/** Debounce duration for URL updates (ms) */
const DEBOUNCE_MS = 300;

function isSeedRole(value: string): value is SeedRole {
	return value === "source" || value === "target" || value === "bidirectional";
}

function getProperty(data: unknown, key: string): unknown {
	if (typeof data === "object" && data !== null) {
		// Spread into new object to safely access properties
		const entries = Object.entries(data);
		for (const [k, v] of entries) {
			if (k === key) return v;
		}
	}
	return undefined;
}

function getString(data: unknown, key: string): string | undefined {
	const value = getProperty(data, key);
	return typeof value === "string" ? value : undefined;
}

function getNumber(data: unknown, key: string): number | undefined {
	const value = getProperty(data, key);
	return typeof value === "number" ? value : undefined;
}

export function useUrlSync(): void {
	const graph = useGraphStore((state) => state.graph);
	const directed = useGraphStore((state) => state.directed);
	const seeds = useGraphStore((state) => state.seeds);
	const setGraph = useGraphStore((state) => state.setGraph);
	const setSeeds = useGraphStore((state) => state.setSeeds);
	const setGraphLoadedFromUrl = useGraphStore(
		(state) => state.setGraphLoadedFromUrl,
	);

	const columns = useColumnStore((state) => state.columns);
	const setColumns = useColumnStore((state) => state.setColumns);

	const currentFrameIndex = useAnimationStore(
		(state) => state.currentFrameIndex,
	);
	const speed = useAnimationStore((state) => state.speed);
	const setSpeed = useAnimationStore((state) => state.setSpeed);

	const selectedFixture = useAppStore((state) => state.selectedFixture);
	const setSelectedFixture = useAppStore((state) => state.setSelectedFixture);

	const nodeCount = useGenerationStore((state) => state.nodeCount);
	const seed = useGenerationStore((state) => state.seed);
	const setNodeCount = useGenerationStore((state) => state.setNodeCount);
	const setSeed = useGenerationStore((state) => state.setSeed);

	const zoomEnabled = useInteractionStore((state) => state.zoomEnabled);
	const panEnabled = useInteractionStore((state) => state.panEnabled);
	const setZoomEnabled = useInteractionStore((state) => state.setZoomEnabled);
	const setPanEnabled = useInteractionStore((state) => state.setPanEnabled);

	const isInitialLoad = useRef(true);
	const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Load from URL on mount
	useEffect(() => {
		const state: SerialisedStateV2Type | null = deserialiseFromHash();
		if (state === null) {
			// No URL data, allow save effect to run
			isInitialLoad.current = false;
			return;
		}

		// Mark that we're loading from URL
		setGraphLoadedFromUrl(true);

		// Reconstruct graph
		const newGraph = state.g.d
			? AdjacencyMapGraph.directed()
			: AdjacencyMapGraph.undirected();

		for (const node of state.g.n) {
			if (
				node.l !== undefined &&
				node.t !== undefined &&
				node.w !== undefined
			) {
				newGraph.addNode({
					id: node.i,
					label: node.l,
					type: node.t,
					weight: node.w,
				});
			} else if (node.l !== undefined && node.t !== undefined) {
				newGraph.addNode({ id: node.i, label: node.l, type: node.t });
			} else if (node.l !== undefined) {
				newGraph.addNode({ id: node.i, label: node.l });
			} else {
				newGraph.addNode({ id: node.i });
			}
		}

		for (const edge of state.g.e) {
			if (edge.y !== undefined && edge.w !== undefined) {
				newGraph.addEdge({
					source: edge.s,
					target: edge.t,
					type: edge.y,
					weight: edge.w,
				});
			} else if (edge.y !== undefined) {
				newGraph.addEdge({ source: edge.s, target: edge.t, type: edge.y });
			} else if (edge.w !== undefined) {
				newGraph.addEdge({ source: edge.s, target: edge.t, weight: edge.w });
			} else {
				newGraph.addEdge({ source: edge.s, target: edge.t });
			}
		}

		setGraph(newGraph, state.g.d);

		// Restore seeds
		const restoredSeeds: Seed[] = state.s.map((s): Seed => {
			if (s.r !== undefined && isSeedRole(s.r)) {
				return { id: s.i, role: s.r };
			}
			return { id: s.i };
		});
		setSeeds(restoredSeeds);

		// Restore columns with all settings
		if (state.c.length > 0) {
			const validExpansionNames = expansionAlgorithmNames();
			const validRankingNames = rankingAlgorithmNames();
			const validMiVariants: readonly MIVariantName[] = [
				"jaccard",
				"adamic-adar",
				"cosine",
				"sorensen",
				"resource-allocation",
				"overlap-coefficient",
				"hub-promoted",
				"scale",
				"skew",
				"span",
				"etch",
				"notch",
				"adaptive",
			];

			function isExpansionName(value: string): value is ExpansionAlgorithmName {
				for (const name of validExpansionNames) {
					if (name === value) return true;
				}
				return false;
			}

			function isMiVariant(value: string): value is MIVariantName {
				for (const name of validMiVariants) {
					if (name === value) return true;
				}
				return false;
			}

			function isRankingName(value: string): value is RankingAlgorithmName {
				for (const name of validRankingNames) {
					if (name === value) return true;
				}
				return false;
			}

			const restoredColumns = state.c.map((col) => ({
				id: col.id,
				expansionAlgorithm:
					col.a !== undefined && isExpansionName(col.a) ? col.a : null,
				miVariant:
					col.mi !== undefined && isMiVariant(col.mi) ? col.mi : "jaccard",
				rankingAlgorithm:
					col.ra !== undefined && isRankingName(col.ra) ? col.ra : "parse",
				expansionResult: null,
				rankingResult: null,
				isRunning: false,
			}));
			setColumns(restoredColumns);
		}

		// Restore application state
		if (state.fx !== undefined) {
			setSelectedFixture(state.fx);
		}
		if (state.nc !== undefined) {
			setNodeCount(state.nc);
		}
		if (state.gs !== undefined) {
			setSeed(state.gs);
		}
		if (state.ze !== undefined) {
			setZoomEnabled(state.ze);
		}
		if (state.pe !== undefined) {
			setPanEnabled(state.pe);
		}
		if (state.sp !== undefined) {
			setSpeed(state.sp);
		}

		isInitialLoad.current = false;
	}, [
		setGraph,
		setSeeds,
		setGraphLoadedFromUrl,
		setColumns,
		setSelectedFixture,
		setNodeCount,
		setSeed,
		setZoomEnabled,
		setPanEnabled,
		setSpeed,
	]);

	// Update URL when state changes (debounced)
	useEffect(() => {
		if (isInitialLoad.current) return;

		if (updateTimeoutRef.current !== null) {
			clearTimeout(updateTimeoutRef.current);
		}

		updateTimeoutRef.current = setTimeout(() => {
			// Extract node and edge data from graph
			const nodes: SerialisedState["g"]["n"] = [];
			const edges: SerialisedState["g"]["e"] = [];

			for (const nodeId of graph.nodeIds()) {
				const data = graph.getNode(nodeId);
				nodes.push({
					i: nodeId,
					l: getString(data, "label"),
					t: getString(data, "type"),
					w: getNumber(data, "weight"),
				});
			}

			for (const { source, target } of graph.edges()) {
				const data = graph.getEdge(source, target);
				edges.push({
					s: source,
					t: target,
					y: getString(data, "type"),
					w: getNumber(data, "weight"),
				});
			}

			// Serialise to v2 format with columns
			const serialisedState: SerialisedState = {
				v: 2,
				g: {
					d: directed,
					n: nodes,
					e: edges,
				},
				s: seeds.map((s) => ({
					i: s.id,
					r: s.role,
				})),
				c: columns.map((col) => ({
					id: col.id,
					a: col.expansionAlgorithm ?? undefined,
					mi: col.miVariant,
					ra: col.rankingAlgorithm,
				})),
				f: currentFrameIndex > 0 ? currentFrameIndex : undefined,
				fx: selectedFixture,
				nc: nodeCount,
				gs: seed,
				ze: zoomEnabled,
				pe: panEnabled,
				sp: speed,
			};

			updateHash(serialisedState);
			updateTimeoutRef.current = null;
		}, DEBOUNCE_MS);

		return () => {
			if (updateTimeoutRef.current !== null) {
				clearTimeout(updateTimeoutRef.current);
			}
		};
	}, [
		graph,
		directed,
		seeds,
		columns,
		currentFrameIndex,
		selectedFixture,
		nodeCount,
		seed,
		zoomEnabled,
		panEnabled,
		speed,
	]);
}
