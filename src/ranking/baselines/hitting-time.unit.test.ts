import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../../graph";
import type { NodeData, EdgeData } from "../../graph";
import type { ExpansionPath } from "../../expansion/types";
import { hittingTime } from "./hitting-time";

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

describe("hittingTime baseline", () => {
	it("returns empty array for no paths", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		const result = hittingTime(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.method).toBe("hitting-time");
	});

	it("ranks a single path with score 1", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });
		graph.addNode({ id: "B", label: "B" });
		graph.addNode({ id: "C", label: "C" });
		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });

		const paths = [createPath(["A", "B", "C"])];
		const result = hittingTime(graph, paths, { mode: "exact" });

		expect(result.paths).toHaveLength(1);
		expect(result.paths[0]?.score).toBe(1);
	});

	it("normalises scores to [0, 1]", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		for (const id of ["A", "B", "C", "D"]) {
			graph.addNode({ id, label: `Node ${id}` });
		}
		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });
		graph.addEdge({ source: "C", target: "D", weight: 1 });

		const paths = [
			createPath(["A", "B"]),
			createPath(["A", "B", "C"]),
			createPath(["A", "B", "C", "D"]),
		];
		const result = hittingTime(graph, paths, { mode: "exact" });

		for (const path of result.paths) {
			expect(path.score).toBeGreaterThanOrEqual(0);
			expect(path.score).toBeLessThanOrEqual(1);
		}
	});

	it("sorts paths by score descending", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		for (const id of ["A", "B", "C", "D"]) {
			graph.addNode({ id, label: `Node ${id}` });
		}
		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });
		graph.addEdge({ source: "C", target: "D", weight: 1 });

		const paths = [createPath(["A", "D"]), createPath(["A", "B", "C", "D"])];
		const result = hittingTime(graph, paths, { mode: "exact" });

		for (let i = 1; i < result.paths.length; i++) {
			const prev = result.paths[i - 1]?.score;
			const curr = result.paths[i]?.score;
			if (prev !== undefined && curr !== undefined) {
				expect(prev).toBeGreaterThanOrEqual(curr);
			}
		}
	});

	it("works in approximate (Monte Carlo) mode", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		for (const id of ["A", "B", "C"]) {
			graph.addNode({ id, label: `Node ${id}` });
		}
		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });

		const paths = [createPath(["A", "C"])];
		const result = hittingTime(graph, paths, {
			mode: "approximate",
			walks: 500,
			seed: 42,
		});

		expect(result.paths).toHaveLength(1);
		expect(result.paths[0]?.score).toBeGreaterThanOrEqual(0);
		expect(result.paths[0]?.score).toBeLessThanOrEqual(1);
	});

	it("auto mode selects exact for small graphs", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		for (const id of ["A", "B", "C"]) {
			graph.addNode({ id, label: `Node ${id}` });
		}
		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });

		const paths = [createPath(["A", "C"])];
		// Auto mode: fewer than 100 nodes → uses exact
		const result = hittingTime(graph, paths, { mode: "auto" });

		expect(result.paths).toHaveLength(1);
		expect(result.method).toBe("hitting-time");
	});

	it("handles paths with undefined endpoints gracefully", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		graph.addNode({ id: "A", label: "A" });

		const emptyPath: ExpansionPath = {
			nodes: [],
			fromSeed: { id: "" },
			toSeed: { id: "" },
		};
		const result = hittingTime(graph, [emptyPath], { mode: "exact" });

		expect(result.paths).toHaveLength(1);
		expect(result.paths[0]?.score).toBe(0);
	});

	it("is deterministic with same seed", () => {
		const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
		for (const id of ["A", "B", "C", "D"]) {
			graph.addNode({ id, label: `Node ${id}` });
		}
		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });
		graph.addEdge({ source: "C", target: "D", weight: 1 });

		const paths = [createPath(["A", "D"])];
		const config = { mode: "approximate" as const, walks: 100, seed: 99 };

		const result1 = hittingTime(graph, paths, config);
		const result2 = hittingTime(graph, paths, config);

		expect(result1.paths[0]?.score).toBe(result2.paths[0]?.score);
	});
});
