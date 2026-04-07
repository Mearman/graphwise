import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../../graph";
import type { NodeData, EdgeData } from "../../graph";
import type { ExplorationPath } from "../../exploration/types";
import { shortest } from "./shortest";

interface TestNode extends NodeData {
	readonly label: string;
}

interface TestEdge extends EdgeData {
	readonly weight: number;
}

function createPath(nodes: string[]): ExplorationPath {
	return {
		nodes,
		fromSeed: { id: nodes[0] ?? "" },
		toSeed: { id: nodes[nodes.length - 1] ?? "" },
	};
}

describe("shortest baseline", () => {
	it("returns empty array for no paths", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		const result = shortest(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.method).toBe("shortest");
	});

	it("ranks single path", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		const paths = [createPath(["A", "B", "C"])];

		const result = shortest(graph, paths);

		expect(result.paths).toHaveLength(1);
		expect(result.paths[0]?.score).toBe(1);
	});

	it("ranks multiple paths by length", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		const paths = [
			createPath(["A", "B", "C", "D"]),
			createPath(["A", "B"]),
			createPath(["A", "B", "C"]),
		];

		const result = shortest(graph, paths);

		expect(result.paths).toHaveLength(3);
		// Shortest path should be first (score = 1)
		expect(result.paths[0]?.nodes).toEqual(["A", "B"]);
		expect(result.paths[0]?.score).toBe(1);
	});

	it("normalises scores", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		const paths = [createPath(["A", "B"]), createPath(["A", "B", "C", "D"])];

		const result = shortest(graph, paths);

		expect(result.paths[0]?.score).toBe(1);
		expect(result.paths[1]?.score).toBeLessThan(1);
		expect(result.paths[1]?.score).toBeGreaterThan(0);
	});

	it("sorts by score descending", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		const paths = [
			createPath(["A", "B", "C", "D", "E"]),
			createPath(["A", "B"]),
			createPath(["A", "B", "C"]),
		];

		const result = shortest(graph, paths);

		for (let i = 1; i < result.paths.length; i++) {
			const prev = result.paths[i - 1]?.score;
			const curr = result.paths[i]?.score;
			if (prev !== undefined && curr !== undefined) {
				expect(prev).toBeGreaterThanOrEqual(curr);
			}
		}
	});

	it("handles paths of same length", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		const paths = [createPath(["A", "B", "C"]), createPath(["D", "E", "F"])];

		const result = shortest(graph, paths);

		expect(result.paths).toHaveLength(2);
		expect(result.paths[0]?.score).toBe(result.paths[1]?.score);
	});

	it("preserves path properties", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		const paths = [createPath(["A", "B", "C"])];

		const result = shortest(graph, paths);

		expect(result.paths[0]?.fromSeed.id).toBe("A");
		expect(result.paths[0]?.toSeed.id).toBe("C");
		expect(result.paths[0]?.nodes).toEqual(["A", "B", "C"]);
	});
});
