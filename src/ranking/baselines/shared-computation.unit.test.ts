/**
 * Regression tests for work shared across paths: resistance distance builds and inverts its Laplacian once per call, and Katz and communicability propagate walks once per distinct anchor endpoint, so the number of graph reads does not grow with the number of paths ranked from the same seeds.
 */

import { describe, expect, it } from "vitest";

import { AdjacencyMapGraph, type ReadableGraph } from "../../graph";
import type { ExplorationPath } from "../../exploration/types";
import { communicability } from "./communicability";
import { katz } from "./katz";
import { resistanceDistance } from "./resistance-distance";

const RING_SIZE = 24;

/**
 * An undirected ring with chords, wrapped so every neighbour and degree read is counted.
 */
const countingRing = (): { graph: ReadableGraph; reads: { count: number } } => {
	const inner = AdjacencyMapGraph.undirected();
	for (let i = 0; i < RING_SIZE; i++) inner.addNode({ id: `n${String(i)}` });
	for (let i = 0; i < RING_SIZE; i++) {
		inner.addEdge({
			source: `n${String(i)}`,
			target: `n${String((i + 1) % RING_SIZE)}`,
		});
		inner.addEdge({
			source: `n${String(i)}`,
			target: `n${String((i + 5) % RING_SIZE)}`,
		});
	}
	const reads = { count: 0 };
	const graph: ReadableGraph = {
		directed: inner.directed,
		nodeCount: inner.nodeCount,
		edgeCount: inner.edgeCount,
		hasNode: (id) => inner.hasNode(id),
		getNode: (id) => inner.getNode(id),
		nodeIds: () => inner.nodeIds(),
		neighbours: (id, direction) => {
			reads.count++;
			return inner.neighbours(id, direction);
		},
		degree: (id, direction) => {
			reads.count++;
			return inner.degree(id, direction);
		},
		getEdge: (source, target) => inner.getEdge(source, target),
		edges: () => inner.edges(),
	};
	return { graph, reads };
};

const pathsFrom = (seed: string, targets: number): ExplorationPath[] =>
	Array.from({ length: targets }, (_, i) => ({
		fromSeed: { id: seed },
		toSeed: { id: `n${String(i + 1)}` },
		nodes: [seed, `n${String(i + 1)}`],
	}));

const readsFor = (rank: typeof katz, pathCount: number): number => {
	const { graph, reads } = countingRing();
	rank(graph, pathsFrom("n0", pathCount));
	return reads.count;
};

describe("work shared across paths", () => {
	const FEW_PATHS = 2;
	const MANY_PATHS = 20;

	it("reads the graph the same number of times for many paths from one seed as for few: katz", () => {
		expect(readsFor(katz, MANY_PATHS)).toBe(readsFor(katz, FEW_PATHS));
	});

	it("reads the graph the same number of times for many paths from one seed as for few: communicability", () => {
		expect(readsFor(communicability, MANY_PATHS)).toBe(
			readsFor(communicability, FEW_PATHS),
		);
	});

	it("reads the graph the same number of times for many paths as for few: resistance distance", () => {
		expect(readsFor(resistanceDistance, MANY_PATHS)).toBe(
			readsFor(resistanceDistance, FEW_PATHS),
		);
	});
});
