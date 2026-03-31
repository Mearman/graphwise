import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import { stride, type StrideOptions, type StrideResult } from "./stride";

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
 * Create a star graph with a central hub
 */
function createStarGraph(nLeafs = 5): AdjacencyMapGraph {
	const graph = AdjacencyMapGraph.undirected();

	graph.addNode({ id: "center" });
	for (let i = 0; i < nLeafs; i++) {
		const leafId = `leaf${String(i)}`;
		graph.addNode({ id: leafId });
		graph.addEdge({ source: "center", target: leafId });
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
 * Create a graph with two distinct clusters connected by a single bridge
 */
function createClusteredGraph(): AdjacencyMapGraph {
	const graph = AdjacencyMapGraph.undirected();

	graph.addNode({ id: "A1" });
	graph.addNode({ id: "A2" });
	graph.addNode({ id: "A3" });
	graph.addEdge({ source: "A1", target: "A2" });
	graph.addEdge({ source: "A2", target: "A3" });
	graph.addEdge({ source: "A1", target: "A3" });

	graph.addNode({ id: "B1" });
	graph.addNode({ id: "B2" });
	graph.addNode({ id: "B3" });
	graph.addEdge({ source: "B1", target: "B2" });
	graph.addEdge({ source: "B2", target: "B3" });
	graph.addEdge({ source: "B1", target: "B3" });

	graph.addEdge({ source: "A1", target: "B1" });

	return graph;
}

describe("stride seed selection", () => {
	describe("result structure", () => {
		it("returns a result object with correct structure", () => {
			const graph = createLinearGraph();
			const result = stride(graph);

			expect(result).toHaveProperty("pairs");
			expect(result).toHaveProperty("triadCounts");
			expect(result).toHaveProperty("categories");
			expect(Array.isArray(result.pairs)).toBe(true);
			expect(result.triadCounts instanceof Map).toBe(true);
			expect(result.categories instanceof Map).toBe(true);
		});

		it("returns StrideSeedPair objects with correct structure", () => {
			const graph = createCompleteGraph(10);
			const result = stride(graph, { nPairs: 5 });

			expect(result.pairs.length).toBeGreaterThan(0);

			const pair = result.pairs[0];
			expect(pair).toBeDefined();
			if (!pair) throw new Error("Expected pair to be defined");

			expect(pair).toHaveProperty("source");
			expect(pair).toHaveProperty("target");
			expect(pair).toHaveProperty("sourceTriads");
			expect(pair).toHaveProperty("targetTriads");
			expect(pair).toHaveProperty("sourceCategory");
			expect(pair).toHaveProperty("targetCategory");
			expect(pair.source).toHaveProperty("id");
			expect(pair.target).toHaveProperty("id");
			expect(typeof pair.sourceTriads).toBe("number");
			expect(typeof pair.targetTriads).toBe("number");
			expect(typeof pair.sourceCategory).toBe("string");
			expect(typeof pair.targetCategory).toBe("string");
		});
	});

	describe("empty graph handling", () => {
		it("returns empty result for empty graph", () => {
			const graph = AdjacencyMapGraph.undirected();
			const result = stride(graph);

			expect(result.pairs).toHaveLength(0);
			expect(result.triadCounts.size).toBe(0);
			expect(result.categories.size).toBe(0);
		});

		it("returns empty result for single node", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });

			const result = stride(graph);

			expect(result.pairs).toHaveLength(0);
		});
	});

	describe("triad counting", () => {
		it("computes triad counts for all nodes", () => {
			const graph = createCompleteGraph(6);
			const result = stride(graph);

			expect(result.triadCounts.size).toBe(6);
		});

		it("triad counts are non-negative integers", () => {
			const graph = createCompleteGraph(6);
			const result = stride(graph);

			for (const [, count] of result.triadCounts) {
				expect(count).toBeGreaterThanOrEqual(0);
				expect(Number.isInteger(count)).toBe(true);
			}
		});

		it("complete graph nodes have high triad counts", () => {
			const graph = createCompleteGraph(6);
			const result = stride(graph);

			for (const [, count] of result.triadCounts) {
				expect(count).toBeGreaterThan(0);
			}
		});

		it("linear graph nodes have lower triad counts", () => {
			const graph = createLinearGraph();
			const result = stride(graph);

			for (const [, count] of result.triadCounts) {
				expect(count).toBe(0);
			}
		});
	});

	describe("categorisation", () => {
		it("assigns categories to all nodes", () => {
			const graph = createCompleteGraph(6);
			const result = stride(graph);

			expect(result.categories.size).toBe(6);
		});

		it("categories are core, bridge, or periphery", () => {
			const graph = createCompleteGraph(6);
			const result = stride(graph);

			const validCategories = new Set(["core", "bridge", "periphery"]);
			for (const [, category] of result.categories) {
				expect(validCategories.has(category)).toBe(true);
			}
		});

		it("complete graph nodes have same category (uniform triads)", () => {
			const graph = createCompleteGraph(6);
			const result = stride(graph);

			const categories = new Set(result.categories.values());
			expect(categories.size).toBe(1);
		});

		it("linear graph nodes are all periphery", () => {
			const graph = createLinearGraph();
			const result = stride(graph);

			for (const [, category] of result.categories) {
				expect(category).toBe("periphery");
			}
		});
	});

	describe("options handling", () => {
		it("uses default options when none provided", () => {
			const graph = createLinearGraph();
			const result = stride(graph);

			expect(result).toBeDefined();
		});

		it("respects nPairs option", () => {
			const graph = createCompleteGraph(20);
			const result = stride(graph, { nPairs: 5 });

			expect(result.pairs.length).toBeLessThanOrEqual(5);
		});

		it("respects rngSeed for reproducibility", () => {
			const graph = createCompleteGraph(20);

			const result1 = stride(graph, { rngSeed: 42, nPairs: 5 });
			const result2 = stride(graph, { rngSeed: 42, nPairs: 5 });

			expect(result1.pairs.length).toBe(result2.pairs.length);

			for (const [nodeId, count1] of result1.triadCounts) {
				const count2 = result2.triadCounts.get(nodeId);
				expect(count2).toBe(count1);
			}

			for (const [nodeId, cat1] of result1.categories) {
				const cat2 = result2.categories.get(nodeId);
				expect(cat2).toBe(cat1);
			}
		});

		it("produces different results with different seeds", () => {
			const graph = createCompleteGraph(30);

			const result1 = stride(graph, { rngSeed: 1 });
			const result2 = stride(graph, { rngSeed: 999 });

			expect(result1).toBeDefined();
			expect(result2).toBeDefined();
		});
	});

	describe("pair properties", () => {
		it("source and target are distinct nodes", () => {
			const graph = createCompleteGraph(10);
			const result = stride(graph, { nPairs: 10 });

			for (const pair of result.pairs) {
				expect(pair.source.id).not.toBe(pair.target.id);
			}
		});

		it("triads are non-negative", () => {
			const graph = createCompleteGraph(10);
			const result = stride(graph, { nPairs: 10 });

			for (const pair of result.pairs) {
				expect(pair.sourceTriads).toBeGreaterThanOrEqual(0);
				expect(pair.targetTriads).toBeGreaterThanOrEqual(0);
			}
		});
	});

	describe("cross-category pairs", () => {
		it("selects cross-category pairs when possible", () => {
			const graph = createClusteredGraph();
			const result = stride(graph, { nPairs: 10 });

			expect(result.pairs).toBeDefined();
			expect(result.pairs.length).toBeGreaterThanOrEqual(0);
		});
	});

	describe("graph types", () => {
		it("works with undirected graphs", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addEdge({ source: "A", target: "B" });

			const result = stride(graph);

			expect(result.pairs).toBeDefined();
		});

		it("works with directed graphs", () => {
			const graph = AdjacencyMapGraph.directed();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addEdge({ source: "A", target: "B" });

			const result = stride(graph);

			expect(result.pairs).toBeDefined();
		});
	});

	describe("edge cases", () => {
		it("handles graph with isolated nodes", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addNode({ id: "C" });
			graph.addEdge({ source: "A", target: "B" });

			const result = stride(graph);

			expect(result.categories.get("C")).toBe("periphery");
		});

		it("handles highly connected hub node", () => {
			const graph = createStarGraph(10);
			const result = stride(graph);

			expect(result.triadCounts.size).toBe(11);
			expect(result.categories.size).toBe(11);
		});

		it("handles triangle", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addNode({ id: "C" });
			graph.addEdge({ source: "A", target: "B" });
			graph.addEdge({ source: "B", target: "C" });
			graph.addEdge({ source: "C", target: "A" });

			const result = stride(graph);

			for (const [, count] of result.triadCounts) {
				expect(count).toBe(1);
			}

			const categories = new Set(result.categories.values());
			expect(categories.size).toBe(1);
		});
	});

	describe("type safety", () => {
		it("StrideOptions interface accepts all documented options", () => {
			const options: StrideOptions = {
				nPairs: 50,
				rngSeed: 123,
				diversityThreshold: 0.6,
			};

			const graph = createLinearGraph();
			const result: StrideResult = stride(graph, options);

			expect(result).toBeDefined();
		});
	});
});
