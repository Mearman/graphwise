import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../../graph";
import type { NodeData, EdgeData } from "../../graph";
import type { ExpansionPath } from "../../expansion/types";
import { degreeSum } from "./degree-sum";

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

describe("degreeSum baseline", () => {
	it("returns empty array for no paths", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		const result = degreeSum(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.method).toBe("degree-sum");
	});

	it("ranks single path", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });
		graph.addNode({ id: "C", label: "C" });
		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });

		const paths = [createPath(["A", "B", "C"])];
		const result = degreeSum(graph, paths);

		expect(result.paths).toHaveLength(1);
		expect(result.paths[0]?.score).toBe(1);
	});

	it("ranks multiple paths by degree sum", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		const nodes = ["A", "B", "C", "D", "E"];

		for (const id of nodes) {
			graph.addNode({ id, label: `Node ${id}` });
		}

		for (let i = 0; i < nodes.length - 1; i++) {
			const source = nodes[i];
			const target = nodes[i + 1];
			if (source !== undefined && target !== undefined) {
				graph.addEdge({ source, target, weight: 1 });
			}
		}

		const paths = [
			createPath(["A", "B"]), // low degree sum
			createPath(["B", "C", "D"]), // higher degree sum
		];

		const result = degreeSum(graph, paths);

		expect(result.paths).toHaveLength(2);
		// Path with higher degree sum should be first
		expect(result.paths[0]?.nodes).toEqual(["B", "C", "D"]);
	});

	it("normalises scores to [0, 1]", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });
		graph.addEdge({ source: "A", target: "B", weight: 1 });

		const paths = [createPath(["A", "B"])];
		const result = degreeSum(graph, paths);

		expect(result.paths[0]?.score).toBe(1);
	});

	it("handles zero degree sum gracefully", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });

		const paths = [createPath(["A"]), createPath(["B"])];
		const result = degreeSum(graph, paths);

		expect(result.paths).toHaveLength(2);
		expect(result.paths[0]?.score).toBe(0);
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

		const result = degreeSum(graph, paths);

		for (let i = 1; i < result.paths.length; i++) {
			const prev = result.paths[i - 1]?.score;
			const curr = result.paths[i]?.score;
			if (prev !== undefined && curr !== undefined) {
				expect(prev).toBeGreaterThanOrEqual(curr);
			}
		}
	});
});
