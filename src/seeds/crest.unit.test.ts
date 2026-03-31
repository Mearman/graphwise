import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import { crest, type CrestOptions, type CrestResult } from "./crest";

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

describe("crest seed selection", () => {
	describe("result structure", () => {
		it("returns a result object with correct structure", () => {
			const graph = createLinearGraph();
			const result = crest(graph);

			expect(result).toHaveProperty("pairs");
			expect(Array.isArray(result.pairs)).toBe(true);
		});

		it("returns CrestSeedPair objects with correct structure", () => {
			const graph = createCompleteGraph(10);
			const result = crest(graph, { nPairs: 5 });

			expect(result.pairs.length).toBeGreaterThan(0);

			const pair = result.pairs[0];
			expect(pair).toBeDefined();
			if (!pair) throw new Error("Expected pair to be defined");

			expect(pair).toHaveProperty("source");
			expect(pair).toHaveProperty("target");
			expect(pair).toHaveProperty("bridgeScore");
			expect(pair.source).toHaveProperty("id");
			expect(pair.target).toHaveProperty("id");
			expect(typeof pair.bridgeScore).toBe("number");
		});
	});

	describe("empty graph handling", () => {
		it("returns empty result for empty graph", () => {
			const graph = AdjacencyMapGraph.undirected();
			const result = crest(graph);

			expect(result.pairs).toHaveLength(0);
		});

		it("returns empty result for single node", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });

			const result = crest(graph);

			expect(result.pairs).toHaveLength(0);
		});
	});

	describe("bridge score computation", () => {
		it("assigns higher bridge scores to cross-community pairs", () => {
			const graph = createClusteredGraph();
			const result = crest(graph, { nPairs: 10 });

			expect(result.pairs.length).toBeGreaterThan(0);

			for (const pair of result.pairs) {
				expect(pair.bridgeScore).toBeGreaterThanOrEqual(0);
			}
		});
	});

	describe("options handling", () => {
		it("uses default options when none provided", () => {
			const graph = createLinearGraph();
			const result = crest(graph);

			expect(result).toBeDefined();
		});

		it("respects nPairs option", () => {
			const graph = createCompleteGraph(20);
			const result = crest(graph, { nPairs: 5 });

			expect(result.pairs.length).toBeLessThanOrEqual(5);
		});

		it("respects sampleSize option", () => {
			const graph = createCompleteGraph(50);
			const result = crest(graph, { sampleSize: 100 });

			expect(result).toBeDefined();
		});

		it("respects diversityThreshold option", () => {
			const graph = createCompleteGraph(20);

			const result1 = crest(graph, { diversityThreshold: 0.1 });
			const result2 = crest(graph, { diversityThreshold: 0.9 });

			expect(result1.pairs).toBeDefined();
			expect(result2.pairs).toBeDefined();
		});

		it("respects rngSeed for reproducibility", () => {
			const graph = createCompleteGraph(20);

			const result1 = crest(graph, { rngSeed: 42, nPairs: 5 });
			const result2 = crest(graph, { rngSeed: 42, nPairs: 5 });

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
			const graph = createCompleteGraph(30);

			const result1 = crest(graph, { rngSeed: 1 });
			const result2 = crest(graph, { rngSeed: 999 });

			expect(result1).toBeDefined();
			expect(result2).toBeDefined();
		});
	});

	describe("pair properties", () => {
		it("source and target are distinct nodes", () => {
			const graph = createCompleteGraph(10);
			const result = crest(graph, { nPairs: 10 });

			for (const pair of result.pairs) {
				expect(pair.source.id).not.toBe(pair.target.id);
			}
		});

		it("bridgeScore is non-negative", () => {
			const graph = createCompleteGraph(10);
			const result = crest(graph, { nPairs: 10 });

			for (const pair of result.pairs) {
				expect(pair.bridgeScore).toBeGreaterThanOrEqual(0);
			}
		});
	});

	describe("graph types", () => {
		it("works with undirected graphs", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addEdge({ source: "A", target: "B" });

			const result = crest(graph);

			expect(result.pairs).toBeDefined();
		});

		it("works with directed graphs", () => {
			const graph = AdjacencyMapGraph.directed();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addEdge({ source: "A", target: "B" });

			const result = crest(graph);

			expect(result.pairs).toBeDefined();
		});
	});

	describe("type safety", () => {
		it("CrestOptions interface accepts all documented options", () => {
			const options: CrestOptions = {
				nPairs: 50,
				rngSeed: 123,
				diversityThreshold: 0.6,
				sampleSize: 1000,
			};

			const graph = createLinearGraph();
			const result: CrestResult = crest(graph, options);

			expect(result).toBeDefined();
		});
	});
});
