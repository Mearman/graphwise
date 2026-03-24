import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../../graph";
import type { NodeData, EdgeData } from "../../graph";
import type { ExpansionPath } from "../../expansion/types";
import { pagerank } from "./pagerank";

interface TestNode extends NodeData {
	readonly label: string;
}

interface TestEdge extends EdgeData {
	readonly weight: number;
}

function createPath(nodes: string[]): ExpansionPath {
	return {
		nodes,
		fromSeed: { id: nodes[0] ?? "" },
		toSeed: { id: nodes[nodes.length - 1] ?? "" },
	};
}

describe("pagerank baseline", () => {
	it("returns empty array for no paths", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		const result = pagerank(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.method).toBe("pagerank");
	});

	it("ranks single path", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });
		graph.addNode({ id: "C", label: "C" });
		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });

		const paths = [createPath(["A", "B", "C"])];
		const result = pagerank(graph, paths);

		expect(result.paths).toHaveLength(1);
		// Single path is normalised to 1 when it's the max
		expect(result.paths[0]?.score).toBeGreaterThan(0);
		expect(result.paths[0]?.score).toBeLessThanOrEqual(1);
	});

	it("normalises scores to [0, 1]", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		const nodes = ["A", "B", "C"];

		for (const id of nodes) {
			graph.addNode({ id, label: `Node ${id}` });
		}

		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });

		const paths = [createPath(["A", "B"]), createPath(["A", "B", "C"])];
		const result = pagerank(graph, paths);

		expect(result.paths[0]?.score).toBeLessThanOrEqual(1);
		expect(result.paths[0]?.score).toBeGreaterThanOrEqual(0);
	});

	it("handles empty graph gracefully", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();

		const result = pagerank(graph, []);

		expect(result.paths).toHaveLength(0);
	});

	it("ranks multiple paths by PageRank sum", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		const nodes = ["A", "B", "C", "D"];

		for (const id of nodes) {
			graph.addNode({ id, label: `Node ${id}` });
		}

		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });
		graph.addEdge({ source: "C", target: "D", weight: 1 });

		const paths = [
			createPath(["A"]),
			createPath(["A", "B"]),
			createPath(["A", "B", "C"]),
		];

		const result = pagerank(graph, paths);

		expect(result.paths).toHaveLength(3);
	});

	it("sorts by score descending", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		const nodes = ["A", "B", "C", "D"];

		for (const id of nodes) {
			graph.addNode({ id, label: `Node ${id}` });
		}

		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });
		graph.addEdge({ source: "C", target: "D", weight: 1 });

		const paths = [
			createPath(["A"]),
			createPath(["A", "B"]),
			createPath(["A", "B", "C"]),
		];

		const result = pagerank(graph, paths);

		for (let i = 1; i < result.paths.length; i++) {
			const prev = result.paths[i - 1]?.score;
			const curr = result.paths[i]?.score;
			if (prev !== undefined && curr !== undefined) {
				expect(prev).toBeGreaterThanOrEqual(curr);
			}
		}
	});
});
