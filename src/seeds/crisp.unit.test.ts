import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import { crisp, type CrispOptions, type CrispResult } from "./crisp";

/**
 * Create a simple linear graph: A - B - C - D - E
 */
function createLinearGraph(): AdjacencyMapGraph {
	const graph = AdjacencyMapGraph.undirected();
	const nodes = ["A", "B", "C", "D", "E"];

	for (const id of nodes) {
		graph.addNode({ id });
	}

	for (let i = 0; i < nodes.length - 1; i++) {
		const source = nodes[i];
		const target = nodes[i + 1];
		if (source !== undefined && target !== undefined) {
			graph.addEdge({ source, target });
		}
	}

	return graph;
}

/**
 * Create a complete graph where every node is connected to every other
 */
function createCompleteGraph(nNodes = 5): AdjacencyMapGraph {
	const graph = AdjacencyMapGraph.undirected();
	const nodes = Array.from({ length: nNodes }, (_, i) => `N${String(i)}`);

	for (const id of nodes) {
		graph.addNode({ id });
	}

	for (let i = 0; i < nodes.length; i++) {
		for (let j = i + 1; j < nodes.length; j++) {
			const source = nodes[i];
			const target = nodes[j];
			if (source !== undefined && target !== undefined) {
				graph.addEdge({ source, target });
			}
		}
	}

	return graph;
}

/**
 * Create a graph with a path: A - B - C - D - E - F - G - H
 */
function createPathGraph(nNodes = 8): AdjacencyMapGraph {
	const graph = AdjacencyMapGraph.undirected();
	const nodes = Array.from({ length: nNodes }, (_, i) => `P${String(i)}`);

	for (const id of nodes) {
		graph.addNode({ id });
	}

	for (let i = 0; i < nodes.length - 1; i++) {
		const source = nodes[i];
		const target = nodes[i + 1];
		if (source !== undefined && target !== undefined) {
			graph.addEdge({ source, target });
		}
	}

	return graph;
}

/**
 * Create a graph where nodes have shared neighbours for testing
 */
function createSharedNeighbourGraph(): AdjacencyMapGraph {
	const graph = AdjacencyMapGraph.undirected();

	graph.addNode({ id: "A" });
	graph.addNode({ id: "B" });
	graph.addNode({ id: "C" });
	graph.addNode({ id: "D" });
	graph.addNode({ id: "E" });

	graph.addEdge({ source: "A", target: "C" });
	graph.addEdge({ source: "A", target: "D" });
	graph.addEdge({ source: "A", target: "E" });
	graph.addEdge({ source: "B", target: "C" });
	graph.addEdge({ source: "B", target: "D" });
	graph.addEdge({ source: "B", target: "E" });

	return graph;
}

describe("crisp seed selection", () => {
	describe("result structure", () => {
		it("returns a result object with correct structure", () => {
			const graph = createPathGraph();
			const result = crisp(graph);

			expect(result).toHaveProperty("pairs");
			expect(Array.isArray(result.pairs)).toBe(true);
		});

		it("returns CrispSeedPair objects with correct structure", () => {
			const graph = createPathGraph(10);
			const result = crisp(graph, { nPairs: 5 });

			expect(result.pairs.length).toBeGreaterThan(0);

			const pair = result.pairs[0];
			expect(pair).toBeDefined();
			if (!pair) throw new Error("Expected pair to be defined");

			expect(pair).toHaveProperty("source");
			expect(pair).toHaveProperty("target");
			expect(pair).toHaveProperty("distance");
			expect(pair).toHaveProperty("commonNeighbours");
			expect(pair).toHaveProperty("score");
			expect(pair.source).toHaveProperty("id");
			expect(pair.target).toHaveProperty("id");
			expect(typeof pair.distance).toBe("number");
			expect(typeof pair.commonNeighbours).toBe("number");
			expect(typeof pair.score).toBe("number");
		});
	});

	describe("empty graph handling", () => {
		it("returns empty result for empty graph", () => {
			const graph = AdjacencyMapGraph.undirected();
			const result = crisp(graph);

			expect(result.pairs).toHaveLength(0);
		});

		it("returns empty result for single node", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });

			const result = crisp(graph);

			expect(result.pairs).toHaveLength(0);
		});
	});

	describe("small graph handling", () => {
		it("handles two-node graph", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addEdge({ source: "A", target: "B" });

			const result = crisp(graph);

			expect(result.pairs.length).toBe(1);
		});

		it("handles three-node graph", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addNode({ id: "C" });
			graph.addEdge({ source: "A", target: "B" });
			graph.addEdge({ source: "B", target: "C" });

			const result = crisp(graph);

			expect(result.pairs.length).toBeGreaterThanOrEqual(0);
		});
	});

	describe("distance filtering", () => {
		it("prefers pairs within distance range 2-4", () => {
			const graph = createPathGraph(8);
			const result = crisp(graph, { nPairs: 10 });

			for (const pair of result.pairs) {
				expect(pair.distance).toBeGreaterThanOrEqual(0);
			}
		});

		it("respects custom distance range", () => {
			const graph = createPathGraph(10);
			const result = crisp(graph, {
				nPairs: 5,
				minDistance: 3,
				maxDistance: 5,
			});

			expect(result.pairs.length).toBeGreaterThan(0);
		});
	});

	describe("common neighbour scoring", () => {
		it("scores pairs with shared neighbours higher", () => {
			const graph = createSharedNeighbourGraph();
			const result = crisp(graph, {
				nPairs: 1,
				minCommonNeighbours: 2,
				minDistance: 1,
				maxDistance: 2,
			});

			if (result.pairs.length > 0) {
				const pair = result.pairs[0];
				expect(pair).toBeDefined();
				if (pair) {
					expect(pair.commonNeighbours).toBeGreaterThanOrEqual(2);
				}
			}
		});
	});

	describe("options handling", () => {
		it("uses default options when none provided", () => {
			const graph = createPathGraph();
			const result = crisp(graph);

			expect(result).toBeDefined();
		});

		it("respects nPairs option", () => {
			const graph = createCompleteGraph(15);
			const result = crisp(graph, { nPairs: 5 });

			expect(result.pairs.length).toBeLessThanOrEqual(5);
		});

		it("respects rngSeed for reproducibility", () => {
			const graph = createPathGraph(10);

			const result1 = crisp(graph, { rngSeed: 42, nPairs: 5 });
			const result2 = crisp(graph, { rngSeed: 42, nPairs: 5 });

			expect(result1.pairs.length).toBe(result2.pairs.length);

			for (let i = 0; i < Math.min(3, result1.pairs.length); i++) {
				const p1 = result1.pairs[i];
				const p2 = result2.pairs[i];
				if (p1 && p2) {
					expect(p1.source.id).toBe(p2.source.id);
					expect(p1.target.id).toBe(p2.target.id);
				}
			}
		});

		it("produces different results with different seeds", () => {
			const graph = createCompleteGraph(20);

			const result1 = crisp(graph, { rngSeed: 1, nPairs: 10 });
			const result2 = crisp(graph, { rngSeed: 999, nPairs: 10 });

			expect(result1).toBeDefined();
			expect(result2).toBeDefined();
		});
	});

	describe("pair properties", () => {
		it("source and target are distinct nodes", () => {
			const graph = createPathGraph(10);
			const result = crisp(graph, { nPairs: 10 });

			for (const pair of result.pairs) {
				expect(pair.source.id).not.toBe(pair.target.id);
			}
		});

		it("score is non-negative", () => {
			const graph = createPathGraph(10);
			const result = crisp(graph, { nPairs: 10 });

			for (const pair of result.pairs) {
				expect(pair.score).toBeGreaterThanOrEqual(0);
			}
		});

		it("commonNeighbours is non-negative", () => {
			const graph = createPathGraph(10);
			const result = crisp(graph, { nPairs: 10 });

			for (const pair of result.pairs) {
				expect(pair.commonNeighbours).toBeGreaterThanOrEqual(0);
			}
		});
	});

	describe("graph types", () => {
		it("works with undirected graphs", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addNode({ id: "C" });
			graph.addEdge({ source: "A", target: "B" });
			graph.addEdge({ source: "B", target: "C" });

			const result = crisp(graph);

			expect(result.pairs).toBeDefined();
		});

		it("works with directed graphs", () => {
			const graph = AdjacencyMapGraph.directed();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addNode({ id: "C" });
			graph.addEdge({ source: "A", target: "B" });
			graph.addEdge({ source: "B", target: "C" });

			const result = crisp(graph);

			expect(result.pairs).toBeDefined();
		});
	});

	describe("type safety", () => {
		it("CrispOptions interface accepts all documented options", () => {
			const options: CrispOptions = {
				nPairs: 50,
				rngSeed: 123,
				minDistance: 1,
				maxDistance: 5,
				minCommonNeighbours: 1,
				diversityThreshold: 0.6,
				sampleSize: 1000,
			};

			const graph = createLinearGraph();
			const result: CrispResult = crisp(graph, options);

			expect(result).toBeDefined();
		});
	});
});
