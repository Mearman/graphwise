import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../../graph";
import type { KGNode } from "../../__test__/fixtures/types";
import { createPath } from "../../__test__/fixtures/helpers";
import { randomRanking } from "./random-ranking";

describe("randomRanking baseline", () => {
	it("returns empty array for no paths", () => {
		const graph = AdjacencyMapGraph.undirected<KGNode>();
		const result = randomRanking(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.method).toBe("random");
	});

	it("ranks single path", () => {
		const graph = AdjacencyMapGraph.undirected<KGNode>();
		graph.addNode({ id: "A", label: "A" });

		const paths = [createPath(["A"])];
		const result = randomRanking(graph, paths, { seed: 42 });

		expect(result.paths).toHaveLength(1);
		expect(result.paths[0]?.score).toBe(1);
	});

	it("is reproducible with same seed", () => {
		const graph = AdjacencyMapGraph.undirected<KGNode>();
		const nodes = ["A", "B", "C"];

		for (const id of nodes) {
			graph.addNode({ id, label: `Node ${id}` });
		}

		const paths = [
			createPath(["A", "B"]),
			createPath(["B", "C"]),
			createPath(["A", "B", "C"]),
		];

		const result1 = randomRanking(graph, paths, { seed: 42 });
		const result2 = randomRanking(graph, paths, { seed: 42 });

		expect(result1.paths).toEqual(result2.paths);
	});

	it("produces different results with different seeds", () => {
		const graph = AdjacencyMapGraph.undirected<KGNode>();
		const nodes = ["A", "B", "C", "D"];

		for (const id of nodes) {
			graph.addNode({ id, label: `Node ${id}` });
		}

		const paths = [
			createPath(["A", "B"]),
			createPath(["B", "C"]),
			createPath(["C", "D"]),
		];

		const result1 = randomRanking(graph, paths, { seed: 1 });
		const result2 = randomRanking(graph, paths, { seed: 2 });

		// Very unlikely to be identical with different seeds
		const identical =
			JSON.stringify(result1.paths) === JSON.stringify(result2.paths);
		expect(identical).toBe(false);
	});

	it("normalises scores to [0, 1]", () => {
		const graph = AdjacencyMapGraph.undirected<KGNode>();
		const nodes = ["A", "B", "C"];

		for (const id of nodes) {
			graph.addNode({ id, label: `Node ${id}` });
		}

		const paths = [
			createPath(["A"]),
			createPath(["A", "B"]),
			createPath(["A", "B", "C"]),
		];

		const result = randomRanking(graph, paths, { seed: 42 });

		for (const path of result.paths) {
			expect(path.score).toBeLessThanOrEqual(1);
			expect(path.score).toBeGreaterThanOrEqual(0);
		}
	});

	it("ranks multiple paths", () => {
		const graph = AdjacencyMapGraph.undirected<KGNode>();
		const nodes = ["A", "B", "C", "D"];

		for (const id of nodes) {
			graph.addNode({ id, label: `Node ${id}` });
		}

		const paths = [
			createPath(["A"]),
			createPath(["A", "B"]),
			createPath(["A", "B", "C"]),
			createPath(["A", "B", "C", "D"]),
		];

		const result = randomRanking(graph, paths, { seed: 42 });

		expect(result.paths).toHaveLength(4);
	});

	it("sorts by score descending", () => {
		const graph = AdjacencyMapGraph.undirected<KGNode>();
		const nodes = ["A", "B", "C", "D"];

		for (const id of nodes) {
			graph.addNode({ id, label: `Node ${id}` });
		}

		const paths = [
			createPath(["A"]),
			createPath(["A", "B"]),
			createPath(["A", "B", "C"]),
			createPath(["A", "B", "C", "D"]),
		];

		const result = randomRanking(graph, paths, { seed: 42 });

		for (let i = 1; i < result.paths.length; i++) {
			const prev = result.paths[i - 1]?.score;
			const curr = result.paths[i]?.score;
			if (prev !== undefined && curr !== undefined) {
				expect(prev).toBeGreaterThanOrEqual(curr);
			}
		}
	});
});
