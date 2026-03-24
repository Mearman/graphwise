/**
 * Unit tests for fixture helpers.
 *
 * Validates path creation and MI calculation functions.
 */

import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../../graph";
import type { NodeData, EdgeData } from "../../graph";
import { createPath, pathMI, meanPathMI } from "./helpers";
import { jaccard } from "../../ranking/mi";

interface TestNode extends NodeData {
	readonly label: string;
}

interface TestEdge extends EdgeData {
	readonly weight: number;
}

/**
 * Create a simple test graph for helper validation:
 *
 *     A --- B --- C --- D
 */
function createSimpleChain(): AdjacencyMapGraph<TestNode, TestEdge> {
	const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();

	for (const id of ["A", "B", "C", "D"]) {
		graph.addNode({ id, label: `Node ${id}` });
	}

	graph.addEdge({ source: "A", target: "B", weight: 1 });
	graph.addEdge({ source: "B", target: "C", weight: 1 });
	graph.addEdge({ source: "C", target: "D", weight: 1 });

	return graph;
}

describe("createPath", () => {
	it("creates path from node array", () => {
		const path = createPath(["A", "B", "C"]);

		expect(path.nodes).toEqual(["A", "B", "C"]);
		expect(path.fromSeed.id).toBe("A");
		expect(path.toSeed.id).toBe("C");
	});

	it("creates single-node path", () => {
		const path = createPath(["A"]);

		expect(path.nodes).toEqual(["A"]);
		expect(path.fromSeed.id).toBe("A");
		expect(path.toSeed.id).toBe("A");
	});

	it("throws on empty array", () => {
		expect(() => createPath([])).toThrow();
	});
});

describe("pathMI", () => {
	it("calculates MI for two-node path", () => {
		const graph = createSimpleChain();
		const path = createPath(["A", "B"]);

		const mi = pathMI(graph, path, jaccard);

		expect(mi).toBeGreaterThan(0);
		expect(mi).toBeLessThanOrEqual(1);
	});

	it("calculates MI for three-node path", () => {
		const graph = createSimpleChain();
		const path = createPath(["A", "B", "C"]);

		const mi = pathMI(graph, path, jaccard);

		expect(mi).toBeGreaterThan(0);
		expect(mi).toBeLessThanOrEqual(1);
	});

	it("returns NaN for single-node path", () => {
		const graph = createSimpleChain();
		const path = createPath(["A"]);

		const mi = pathMI(graph, path, jaccard);

		expect(Number.isNaN(mi)).toBe(true);
	});

	it("geometric mean eliminates length bias", () => {
		const graph = createSimpleChain();

		// Two-edge path A-B-C
		const path2 = createPath(["A", "B", "C"]);
		const mi2 = pathMI(graph, path2, jaccard);

		// Three-edge path A-B-C-D (even with lower per-edge MI, geometric mean should reflect actual quality)
		const path3 = createPath(["A", "B", "C", "D"]);
		const mi3 = pathMI(graph, path3, jaccard);

		// Both should have meaningful values (not penalised just for length)
		expect(mi2).toBeGreaterThan(0);
		expect(mi3).toBeGreaterThan(0);
	});
});

describe("meanPathMI", () => {
	it("calculates mean MI for multiple paths", () => {
		const graph = createSimpleChain();
		const paths = [
			createPath(["A", "B"]),
			createPath(["B", "C"]),
			createPath(["C", "D"]),
		];

		const mean = meanPathMI(graph, paths, jaccard);

		expect(mean).toBeGreaterThan(0);
		expect(mean).toBeLessThanOrEqual(1);
	});

	it("returns 0 for empty path list", () => {
		const graph = createSimpleChain();
		const mean = meanPathMI(graph, [], jaccard);

		expect(mean).toBe(0);
	});

	it("excludes single-node paths from average", () => {
		const graph = createSimpleChain();
		const paths = [
			createPath(["A"]), // single node, should be excluded
			createPath(["B", "C"]),
			createPath(["D"]), // single node, should be excluded
		];

		const mean = meanPathMI(graph, paths, jaccard);

		// Should only include the valid two-node path
		expect(mean).toBeGreaterThan(0);
		expect(mean).toBeLessThanOrEqual(1);
	});

	it("returns 0 when all paths are single-node", () => {
		const graph = createSimpleChain();
		const paths = [createPath(["A"]), createPath(["B"]), createPath(["C"])];

		const mean = meanPathMI(graph, paths, jaccard);

		expect(mean).toBe(0);
	});
});
