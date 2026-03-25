import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../../graph";
import type { KGNode } from "../../__test__/fixtures/types";
import { createPath } from "../../__test__/fixtures/helpers";
import { katz } from "./katz";

describe("katz baseline", () => {
	it("returns empty array for no paths", () => {
		const graph = AdjacencyMapGraph.undirected<KGNode>();
		const result = katz(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.method).toBe("katz");
	});

	it("ranks single path", () => {
		const graph = AdjacencyMapGraph.undirected<KGNode>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });
		graph.addNode({ id: "C", label: "C" });
		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });

		const paths = [createPath(["A", "B", "C"])];
		const result = katz(graph, paths);

		expect(result.paths).toHaveLength(1);
		expect(result.paths[0]?.score).toBe(1);
	});

	it("normalises scores to [0, 1]", () => {
		const graph = AdjacencyMapGraph.undirected<KGNode>();
		const nodes = ["A", "B", "C"];

		for (const id of nodes) {
			graph.addNode({ id, label: `Node ${id}` });
		}

		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });

		const paths = [createPath(["A", "B"]), createPath(["A", "B", "C"])];
		const result = katz(graph, paths);

		expect(result.paths[0]?.score).toBeLessThanOrEqual(1);
		expect(result.paths[0]?.score).toBeGreaterThanOrEqual(0);
	});

	it("handles empty graph gracefully", () => {
		const graph = AdjacencyMapGraph.undirected<KGNode>();

		const result = katz(graph, []);

		expect(result.paths).toHaveLength(0);
	});

	it("ranks multiple paths", () => {
		const graph = AdjacencyMapGraph.undirected<KGNode>();
		const nodes = ["A", "B", "C", "D"];

		for (const id of nodes) {
			graph.addNode({ id, label: `Node ${id}` });
		}

		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });
		graph.addEdge({ source: "C", target: "D", weight: 1 });

		const paths = [
			createPath(["A", "D"]),
			createPath(["A", "B", "D"]),
			createPath(["A", "B", "C", "D"]),
		];

		const result = katz(graph, paths);

		expect(result.paths).toHaveLength(3);
	});

	it("sorts by score descending", () => {
		const graph = AdjacencyMapGraph.undirected<KGNode>();
		const nodes = ["A", "B", "C", "D"];

		for (const id of nodes) {
			graph.addNode({ id, label: `Node ${id}` });
		}

		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });
		graph.addEdge({ source: "C", target: "D", weight: 1 });

		const paths = [
			createPath(["A", "D"]),
			createPath(["A", "B", "D"]),
			createPath(["A", "B", "C", "D"]),
		];

		const result = katz(graph, paths);

		for (let i = 1; i < result.paths.length; i++) {
			const prev = result.paths[i - 1]?.score;
			const curr = result.paths[i]?.score;
			if (prev !== undefined && curr !== undefined) {
				expect(prev).toBeGreaterThanOrEqual(curr);
			}
		}
	});
});
