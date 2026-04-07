import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../../graph";
import type { NodeData, EdgeData } from "../../graph";
import type { ExplorationPath } from "../../exploration/types";
import { resistanceDistance } from "./resistance-distance";

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

describe("resistanceDistance baseline", () => {
	it("returns empty array for no paths", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		const result = resistanceDistance(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.method).toBe("resistance-distance");
	});

	it("ranks single path", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });
		graph.addNode({ id: "C", label: "C" });
		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });

		const paths = [createPath(["A", "B", "C"])];
		const result = resistanceDistance(graph, paths);

		expect(result.paths).toHaveLength(1);
		expect(result.paths[0]?.score).toBe(1);
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
		const result = resistanceDistance(graph, paths);

		expect(result.paths[0]?.score).toBeLessThanOrEqual(1);
		expect(result.paths[0]?.score).toBeGreaterThanOrEqual(0);
	});

	it("rejects graphs larger than 5000 nodes", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();

		// Add 5001 nodes (exceeds limit)
		for (let i = 0; i < 5001; i++) {
			const idx = String(i);
			graph.addNode({ id: `N${idx}`, label: `Node ${idx}` });
		}

		const paths = [createPath(["N0", "N1"])];

		expect(() => resistanceDistance(graph, paths)).toThrow();
	});

	it("accepts small graphs", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();

		// Add 10 nodes (much smaller than limit, avoids O(n³) timeout)
		for (let i = 0; i < 10; i++) {
			const idx = String(i);
			graph.addNode({ id: `N${idx}`, label: `Node ${idx}` });
		}

		// Add edges to create a connected graph
		for (let i = 0; i < 9; i++) {
			const idx = String(i);
			const nextIdx = String(i + 1);
			graph.addEdge({ source: `N${idx}`, target: `N${nextIdx}`, weight: 1 });
		}

		const paths = [createPath(["N0", "N1"])];

		expect(() => resistanceDistance(graph, paths)).not.toThrow();
	});

	it("ranks multiple paths", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
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

		const result = resistanceDistance(graph, paths);

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
			createPath(["A", "D"]),
			createPath(["A", "B", "D"]),
			createPath(["A", "B", "C", "D"]),
		];

		const result = resistanceDistance(graph, paths);

		for (let i = 1; i < result.paths.length; i++) {
			const prev = result.paths[i - 1]?.score;
			const curr = result.paths[i]?.score;
			if (prev !== undefined && curr !== undefined) {
				expect(prev).toBeGreaterThanOrEqual(curr);
			}
		}
	});
});
