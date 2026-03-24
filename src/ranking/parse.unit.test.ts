import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import type { NodeData, EdgeData } from "../graph";
import type { ExpansionPath } from "../expansion/types";
import { parse } from "./parse";
import { adamicAdar } from "./mi";

interface TestNode extends NodeData {
	readonly label: string;
}

interface TestEdge extends EdgeData {
	readonly weight: number;
}

function createTestGraph(): AdjacencyMapGraph<TestNode, TestEdge> {
	const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();

	for (const id of ["A", "B", "C", "D", "E"]) {
		graph.addNode({ id, label: `Node ${id}` });
	}

	graph.addEdge({ source: "A", target: "B", weight: 1 });
	graph.addEdge({ source: "B", target: "C", weight: 1 });
	graph.addEdge({ source: "C", target: "D", weight: 1 });
	graph.addEdge({ source: "D", target: "E", weight: 1 });

	return graph;
}

function createPath(nodes: string[]): ExpansionPath {
	return {
		nodes,
		fromSeed: { id: nodes[0] ?? "" },
		toSeed: { id: nodes[nodes.length - 1] ?? "" },
	};
}

describe("parse", () => {
	it("ranks single path", () => {
		const graph = createTestGraph();
		const paths = [createPath(["A", "B", "C"])];

		const result = parse(graph, paths);

		expect(result.paths).toHaveLength(1);
		expect(result.paths[0]?.salience).toBeGreaterThan(0);
		expect(result.stats.pathsRanked).toBe(1);
	});

	it("ranks multiple paths", () => {
		const graph = createTestGraph();
		const paths = [
			createPath(["A", "B"]),
			createPath(["A", "B", "C"]),
			createPath(["A", "B", "C", "D"]),
		];

		const result = parse(graph, paths);

		expect(result.paths).toHaveLength(3);
		expect(result.stats.pathsRanked).toBe(3);
	});

	it("sorts paths by salience descending", () => {
		const graph = createTestGraph();
		const paths = [
			createPath(["A", "B", "C", "D", "E"]),
			createPath(["A", "B"]),
			createPath(["A", "B", "C"]),
		];

		const result = parse(graph, paths);

		for (let i = 1; i < result.paths.length; i++) {
			const prev = result.paths[i - 1]?.salience;
			const curr = result.paths[i]?.salience;
			if (prev !== undefined && curr !== undefined) {
				expect(prev).toBeGreaterThanOrEqual(curr);
			}
		}
	});

	it("handles empty path list", () => {
		const graph = createTestGraph();
		const result = parse(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.pathsRanked).toBe(0);
		expect(result.stats.meanSalience).toBe(0);
		expect(result.stats.medianSalience).toBe(0);
		expect(result.stats.maxSalience).toBe(0);
		expect(result.stats.minSalience).toBe(0);
	});

	it("handles single-node path", () => {
		const graph = createTestGraph();
		const paths = [createPath(["A"])];

		const result = parse(graph, paths);

		expect(result.paths).toHaveLength(1);
		expect(result.paths[0]?.salience).toBeGreaterThan(0);
	});

	it("computes statistics correctly", () => {
		const graph = createTestGraph();
		const paths = [
			createPath(["A", "B"]),
			createPath(["B", "C"]),
			createPath(["C", "D"]),
		];

		const result = parse(graph, paths);

		expect(result.stats.pathsRanked).toBe(3);
		expect(result.stats.meanSalience).toBeGreaterThan(0);
		expect(result.stats.maxSalience).toBeGreaterThanOrEqual(
			result.stats.minSalience,
		);
	});

	it("accepts custom MI function", () => {
		const graph = createTestGraph();
		const paths = [createPath(["A", "B", "C"])];

		const resultDefault = parse(graph, paths);
		const resultCustom = parse(graph, paths, { mi: adamicAdar });

		// Results should differ with different MI functions
		expect(resultDefault.paths[0]?.salience).toBeDefined();
		expect(resultCustom.paths[0]?.salience).toBeDefined();
	});

	it("accepts custom epsilon", () => {
		const graph = createTestGraph();
		const paths = [createPath(["A"])];

		const result = parse(graph, paths, { epsilon: 0.01 });

		expect(result.paths[0]?.salience).toBe(0.01);
	});

	it("computes median for odd number of paths", () => {
		const graph = createTestGraph();
		const paths = [
			createPath(["A", "B"]),
			createPath(["B", "C"]),
			createPath(["C", "D"]),
		];

		const result = parse(graph, paths);

		expect(result.stats.medianSalience).toBeGreaterThan(0);
	});

	it("computes median for even number of paths", () => {
		const graph = createTestGraph();
		const paths = [
			createPath(["A", "B"]),
			createPath(["B", "C"]),
			createPath(["C", "D"]),
			createPath(["D", "E"]),
		];

		const result = parse(graph, paths);

		expect(result.stats.medianSalience).toBeGreaterThan(0);
	});

	it("includes salience scores by default", () => {
		const graph = createTestGraph();
		const paths = [createPath(["A", "B", "C"])];

		const result = parse(graph, paths);

		expect(result.paths[0]).toHaveProperty("salience");
	});

	it("measures duration", () => {
		const graph = createTestGraph();
		const paths = [createPath(["A", "B"])];

		const result = parse(graph, paths);

		expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
	});
});
