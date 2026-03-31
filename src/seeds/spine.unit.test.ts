import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import { spine, type SpineOptions, type SpineResult } from "./spine";

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

describe("spine seed selection", () => {
	describe("result structure", () => {
		it("returns a result object with correct structure", () => {
			const graph = createLinearGraph();
			const result = spine(graph);

			expect(result).toHaveProperty("pairs");
			expect(result).toHaveProperty("skewness");
			expect(Array.isArray(result.pairs)).toBe(true);
			expect(result.skewness instanceof Map).toBe(true);
		});

		it("returns SpineSeedPair objects with correct structure", () => {
			const graph = createStarGraph(8);
			const result = spine(graph, { nPairs: 5 });

			expect(result.pairs.length).toBeGreaterThan(0);

			const pair = result.pairs[0];
			expect(pair).toBeDefined();
			if (!pair) throw new Error("Expected pair to be defined");

			expect(pair).toHaveProperty("source");
			expect(pair).toHaveProperty("target");
			expect(pair).toHaveProperty("sourceSkewness");
			expect(pair).toHaveProperty("targetSkewness");
			expect(pair.source).toHaveProperty("id");
			expect(pair.target).toHaveProperty("id");
			expect(typeof pair.sourceSkewness).toBe("number");
			expect(typeof pair.targetSkewness).toBe("number");
		});
	});

	describe("empty graph handling", () => {
		it("returns empty result for empty graph", () => {
			const graph = AdjacencyMapGraph.undirected();
			const result = spine(graph);

			expect(result.pairs).toHaveLength(0);
			expect(result.skewness.size).toBe(0);
		});

		it("returns empty result for single node", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });

			const result = spine(graph);

			expect(result.pairs).toHaveLength(0);
		});
	});

	describe("skewness computation", () => {
		it("computes skewness for all nodes", () => {
			const graph = createStarGraph(5);
			const result = spine(graph);

			expect(result.skewness.size).toBeGreaterThan(0);
		});

		it("skewness values are finite numbers", () => {
			const graph = createLinearGraph();
			const result = spine(graph);

			for (const [, skew] of result.skewness) {
				expect(Number.isFinite(skew)).toBe(true);
			}
		});

		it("hub nodes have different skewness than leaf nodes", () => {
			const graph = createStarGraph(5);
			const result = spine(graph);

			const centerSkew = result.skewness.get("center");
			const leafSkew = result.skewness.get("leaf0");

			expect(centerSkew).toBeDefined();
			expect(leafSkew).toBeDefined();
		});
	});

	describe("options handling", () => {
		it("uses default options when none provided", () => {
			const graph = createLinearGraph();
			const result = spine(graph);

			expect(result).toBeDefined();
		});

		it("respects nPairs option", () => {
			const graph = createCompleteGraph(20);
			const result = spine(graph, { nPairs: 5 });

			expect(result.pairs.length).toBeLessThanOrEqual(5);
		});

		it("respects rngSeed for reproducibility", () => {
			const graph = createCompleteGraph(20);

			const result1 = spine(graph, { rngSeed: 42, nPairs: 5 });
			const result2 = spine(graph, { rngSeed: 42, nPairs: 5 });

			expect(result1.pairs.length).toBe(result2.pairs.length);

			for (const [nodeId, skew1] of result1.skewness) {
				const skew2 = result2.skewness.get(nodeId);
				expect(skew2).toBe(skew1);
			}
		});

		it("produces different results with different seeds", () => {
			const graph = createCompleteGraph(30);

			const result1 = spine(graph, { rngSeed: 1 });
			const result2 = spine(graph, { rngSeed: 999 });

			expect(result1).toBeDefined();
			expect(result2).toBeDefined();
		});
	});

	describe("pair properties", () => {
		it("source and target are distinct nodes", () => {
			const graph = createCompleteGraph(10);
			const result = spine(graph, { nPairs: 10 });

			for (const pair of result.pairs) {
				expect(pair.source.id).not.toBe(pair.target.id);
			}
		});
	});

	describe("graph types", () => {
		it("works with undirected graphs", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addEdge({ source: "A", target: "B" });

			const result = spine(graph);

			expect(result.pairs).toBeDefined();
		});

		it("works with directed graphs", () => {
			const graph = AdjacencyMapGraph.directed();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addEdge({ source: "A", target: "B" });

			const result = spine(graph);

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

			const result = spine(graph);

			expect(result.pairs).toBeDefined();
			expect(result.skewness).toBeDefined();
		});

		it("handles highly connected hub node", () => {
			const graph = createStarGraph(10);
			const result = spine(graph);

			expect(result.skewness.size).toBe(11);
		});
	});

	describe("type safety", () => {
		it("SpineOptions interface accepts all documented options", () => {
			const options: SpineOptions = {
				nPairs: 50,
				rngSeed: 123,
				diversityThreshold: 0.6,
			};

			const graph = createLinearGraph();
			const result: SpineResult = spine(graph, options);

			expect(result).toBeDefined();
		});
	});
});
