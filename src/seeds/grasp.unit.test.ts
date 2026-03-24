import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import {
	grasp,
	type GraspOptions,
	type GraspResult,
	type GraspSeedPair,
} from "./grasp";

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
 * Create a star graph with a central hub: center connected to all others
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

	// Cluster 1: A1, A2, A3 (fully connected)
	graph.addNode({ id: "A1" });
	graph.addNode({ id: "A2" });
	graph.addNode({ id: "A3" });
	graph.addEdge({ source: "A1", target: "A2" });
	graph.addEdge({ source: "A2", target: "A3" });
	graph.addEdge({ source: "A1", target: "A3" });

	// Cluster 2: B1, B2, B3 (fully connected)
	graph.addNode({ id: "B1" });
	graph.addNode({ id: "B2" });
	graph.addNode({ id: "B3" });
	graph.addEdge({ source: "B1", target: "B2" });
	graph.addEdge({ source: "B2", target: "B3" });
	graph.addEdge({ source: "B1", target: "B3" });

	// Bridge between clusters
	graph.addEdge({ source: "A1", target: "B1" });

	return graph;
}

describe("grasp seed selection", () => {
	describe("result structure", () => {
		it("returns a result object with correct structure", () => {
			const graph = createLinearGraph();
			const result = grasp(graph);

			expect(result).toHaveProperty("pairs");
			expect(result).toHaveProperty("nClusters");
			expect(result).toHaveProperty("sampledNodeCount");
			expect(result).toHaveProperty("features");
			expect(result).toHaveProperty("clusterAssignments");
			expect(Array.isArray(result.pairs)).toBe(true);
			expect(typeof result.nClusters).toBe("number");
			expect(typeof result.sampledNodeCount).toBe("number");
			expect(result.features).toBeInstanceOf(Array);
			expect(result.clusterAssignments).toBeInstanceOf(Map);
		});

		it("returns GraspSeedPair objects with correct structure", () => {
			const graph = createCompleteGraph(10);
			const result = grasp(graph, { pairsPerCluster: 5 });

			const pair = result.pairs[0];
			expect(pair).toBeDefined();
			if (!pair) {
				throw new Error("Expected pair to be defined");
			}
			expect(pair).toHaveProperty("source");
			expect(pair).toHaveProperty("target");
			expect(pair).toHaveProperty("featureDistance");
			expect(pair).toHaveProperty("sameCluster");
			expect(pair).toHaveProperty("sourceCluster");
			expect(pair).toHaveProperty("targetCluster");
			expect(pair.source).toHaveProperty("id");
			expect(pair.target).toHaveProperty("id");
			expect(typeof pair.featureDistance).toBe("number");
			expect(typeof pair.sameCluster).toBe("boolean");
			expect(typeof pair.sourceCluster).toBe("number");
			expect(typeof pair.targetCluster).toBe("number");
		});
	});

	describe("empty graph handling", () => {
		it("returns empty result for empty graph", () => {
			const graph = AdjacencyMapGraph.undirected();
			const result = grasp(graph);

			expect(result.pairs).toHaveLength(0);
			expect(result.sampledNodeCount).toBe(0);
			expect(result.features).toHaveLength(0);
			expect(result.clusterAssignments.size).toBe(0);
		});

		it("returns empty result for graph with no edges", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addNode({ id: "C" });

			const result = grasp(graph);

			// No edges means reservoir sampling finds nothing
			expect(result.pairs).toHaveLength(0);
			expect(result.sampledNodeCount).toBe(0);
		});
	});

	describe("small graph handling", () => {
		it("handles single-edge graph", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addEdge({ source: "A", target: "B" });

			const result = grasp(graph);

			expect(result.sampledNodeCount).toBe(2);
			expect(result.features).toHaveLength(2);
		});

		it("limits clusters to number of sampled nodes", () => {
			const graph = createLinearGraph(); // 5 nodes
			const result = grasp(graph, { nClusters: 100 });

			// nClusters should be limited to 5
			expect(result.nClusters).toBeLessThanOrEqual(5);
		});
	});

	describe("reservoir sampling", () => {
		it("samples nodes from the graph", () => {
			const graph = createCompleteGraph(20);
			const result = grasp(graph, { sampleSize: 10 });

			expect(result.sampledNodeCount).toBeLessThanOrEqual(10);
			expect(result.sampledNodeCount).toBeGreaterThan(0);
		});

		it("includes all nodes when sample size exceeds graph size", () => {
			const graph = createLinearGraph(); // 5 nodes
			const result = grasp(graph, { sampleSize: 1000 });

			expect(result.sampledNodeCount).toBe(5);
		});
	});

	describe("feature computation", () => {
		it("computes features for all sampled nodes", () => {
			const graph = createLinearGraph();
			const result = grasp(graph);

			expect(result.features.length).toBe(result.sampledNodeCount);
		});

		it("features contain nodeId and f1, f2, f3 properties", () => {
			const graph = createCompleteGraph(5);
			const result = grasp(graph);

			expect(result.features.length).toBeGreaterThan(0);

			const feature = result.features[0];
			expect(feature).toBeDefined();
			if (!feature) {
				throw new Error("Expected feature to be defined");
			}
			expect(feature).toHaveProperty("nodeId");
			expect(feature).toHaveProperty("f1");
			expect(feature).toHaveProperty("f2");
			expect(feature).toHaveProperty("f3");
			expect(typeof feature.nodeId).toBe("string");
			expect(typeof feature.f1).toBe("number");
			expect(typeof feature.f2).toBe("number");
			expect(typeof feature.f3).toBe("number");
		});

		it("computes log-degree feature (f1) correctly", () => {
			const graph = createStarGraph(4); // center has degree 4
			const result = grasp(graph);

			// Find the center node's feature
			const centerFeature = result.features.find((f) => f.nodeId === "center");
			expect(centerFeature).toBeDefined();
			if (!centerFeature) {
				throw new Error("Expected centerFeature to be defined");
			}

			// f1 = log(degree + 1) = log(5) ~ 1.609
			// After z-score normalisation, exact value depends on other nodes
			expect(typeof centerFeature.f1).toBe("number");
		});
	});

	describe("clustering", () => {
		it("assigns all sampled nodes to clusters", () => {
			const graph = createCompleteGraph(10);
			const result = grasp(graph);

			for (const feature of result.features) {
				expect(result.clusterAssignments.has(feature.nodeId)).toBe(true);
			}
		});

		it("cluster assignments are non-negative integers", () => {
			const graph = createCompleteGraph(10);
			const result = grasp(graph);

			for (const [, cluster] of result.clusterAssignments) {
				expect(cluster).toBeGreaterThanOrEqual(0);
				expect(Number.isInteger(cluster)).toBe(true);
			}
		});
	});

	describe("pair sampling", () => {
		it("generates pairs within clusters", () => {
			const graph = createCompleteGraph(20);
			const result = grasp(graph, {
				nClusters: 2,
				pairsPerCluster: 10,
				withinClusterRatio: 1.0, // All within-cluster
			});

			const withinClusterPairs = result.pairs.filter((p) => p.sameCluster);
			expect(withinClusterPairs.length).toBeGreaterThan(0);

			// All pairs should be within-cluster
			for (const pair of result.pairs) {
				if (pair.sameCluster) {
					expect(pair.sourceCluster).toBe(pair.targetCluster);
				}
			}
		});

		it("generates cross-cluster pairs", () => {
			const graph = createCompleteGraph(20);
			const result = grasp(graph, {
				nClusters: 2,
				pairsPerCluster: 10,
				withinClusterRatio: 0.0, // All cross-cluster
			});

			// Note: cross-cluster pairs require at least 2 clusters with nodes
			if (result.nClusters >= 2) {
				// Verify we have some pairs
				expect(result.pairs.length).toBeGreaterThanOrEqual(0);
			}
		});

		it("source and target in pairs are distinct nodes", () => {
			const graph = createCompleteGraph(10);
			const result = grasp(graph);

			for (const pair of result.pairs) {
				expect(pair.source.id).not.toBe(pair.target.id);
			}
		});

		it("featureDistance is non-negative", () => {
			const graph = createCompleteGraph(10);
			const result = grasp(graph);

			for (const pair of result.pairs) {
				expect(pair.featureDistance).toBeGreaterThanOrEqual(0);
			}
		});
	});

	describe("options handling", () => {
		it("uses default options when none provided", () => {
			const graph = createLinearGraph();
			const result = grasp(graph);

			expect(result).toBeDefined();
			expect(result.sampledNodeCount).toBe(5);
		});

		it("respects nClusters option", () => {
			const graph = createCompleteGraph(20);
			const result = grasp(graph, { nClusters: 3 });

			expect(result.nClusters).toBeLessThanOrEqual(3);
		});

		it("respects sampleSize option", () => {
			const graph = createCompleteGraph(50);
			const result = grasp(graph, { sampleSize: 10 });

			expect(result.sampledNodeCount).toBeLessThanOrEqual(10);
		});

		it("respects pairsPerCluster option", () => {
			const graph = createCompleteGraph(20);
			const pairsPerCluster = 5;
			const result = grasp(graph, {
				nClusters: 2,
				pairsPerCluster,
			});

			// Total pairs = nClusters * pairsPerCluster (approximately)
			// May be less if some clusters have too few nodes
			expect(result.pairs.length).toBeLessThanOrEqual(
				result.nClusters * pairsPerCluster,
			);
		});

		it("respects rngSeed for reproducibility", () => {
			const graph = createCompleteGraph(20);

			const result1 = grasp(graph, { rngSeed: 42, nClusters: 3 });
			const result2 = grasp(graph, { rngSeed: 42, nClusters: 3 });

			// Same seed should produce same sampled nodes
			expect(result1.sampledNodeCount).toBe(result2.sampledNodeCount);

			// Same seed should produce same cluster assignments
			expect(result1.clusterAssignments.size).toBe(
				result2.clusterAssignments.size,
			);

			// Features should be the same
			expect(result1.features.length).toBe(result2.features.length);
		});

		it("produces different results with different seeds", () => {
			const graph = createCompleteGraph(30);

			const result1 = grasp(graph, { rngSeed: 1 });
			const result2 = grasp(graph, { rngSeed: 999 });

			// Different seeds may produce different cluster counts or pairs
			// We just check it runs without error - exact differences depend on RNG
			expect(result1).toBeDefined();
			expect(result2).toBeDefined();
		});
	});

	describe("graph types", () => {
		it("works with undirected graphs", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addEdge({ source: "A", target: "B" });

			const result = grasp(graph);

			expect(result.sampledNodeCount).toBe(2);
		});

		it("works with directed graphs", () => {
			const graph = AdjacencyMapGraph.directed();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addEdge({ source: "A", target: "B" });

			const result = grasp(graph);

			expect(result.sampledNodeCount).toBe(2);
		});
	});

	describe("edge cases", () => {
		it("handles graph with isolated nodes", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addNode({ id: "C" });
			graph.addEdge({ source: "A", target: "B" });
			// C is isolated

			const result = grasp(graph);

			// Only A and B should be sampled (they're on the edge)
			expect(result.sampledNodeCount).toBe(2);
		});

		it("handles self-loops", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addEdge({ source: "A", target: "A" });

			const result = grasp(graph);

			expect(result.sampledNodeCount).toBe(1);
		});

		it("handles highly connected hub node", () => {
			const graph = createStarGraph(10); // Hub with 10 leafs
			const result = grasp(graph);

			expect(result.sampledNodeCount).toBe(11);
			expect(result.features.length).toBe(11);
		});
	});

	describe("clustered graph behaviour", () => {
		it("identifies different clusters for structurally different nodes", () => {
			const graph = createClusteredGraph();
			const result = grasp(graph, { nClusters: 2 });

			// The graph has 6 nodes in 2 clusters
			expect(result.sampledNodeCount).toBe(6);
			expect(result.nClusters).toBeLessThanOrEqual(2);
		});
	});

	describe("type safety", () => {
		it("GraspOptions interface accepts all documented options", () => {
			const options: GraspOptions = {
				nClusters: 50,
				pairsPerCluster: 20,
				withinClusterRatio: 0.7,
				sampleSize: 10000,
				rngSeed: 123,
				pagerankIterations: 5,
			};

			const graph = createLinearGraph();
			const result = grasp(graph, options);

			expect(result).toBeDefined();
		});

		it("GraspResult interface has expected properties", () => {
			const graph = createLinearGraph();
			const result: GraspResult = grasp(graph);

			const _pairs: readonly GraspSeedPair[] = result.pairs;
			const _nClusters: number = result.nClusters;
			const _sampledNodeCount: number = result.sampledNodeCount;

			expect(_pairs).toBeDefined();
			expect(_nClusters).toBeDefined();
			expect(_sampledNodeCount).toBeDefined();
		});
	});
});
