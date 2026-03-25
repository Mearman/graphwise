import { describe, it, expect } from "vitest";
import { graphToCSR, csrToTypedBuffers, type CSRMatrix } from "./csr";
import { initGPU } from "./root";
import { isWebGPUAvailable } from "./detect";
import { AdjacencyMapGraph } from "../graph/adjacency-map";
import type { NodeData, EdgeData } from "../graph/types";

interface TestNode extends NodeData {
	readonly label: string;
}

interface TestEdge extends EdgeData {
	readonly weight: number;
}

describe("CSR conversion", () => {
	describe("graphToCSR", () => {
		describe("directed graph", () => {
			it("converts an empty directed graph", () => {
				const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();
				const result = graphToCSR(graph);

				expect(result.csr.nodeCount).toBe(0);
				expect(result.csr.edgeCount).toBe(0);
				expect(result.csr.rowOffsets.length).toBe(1); // nodeCount + 1
				expect(result.csr.colIndices.length).toBe(0);
				expect(result.indexMap.nodeToIndex.size).toBe(0);
				expect(result.indexMap.indexToNode.length).toBe(0);
			});

			it("converts a single-node directed graph", () => {
				const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();
				graph.addNode({ id: "A", label: "Node A" });

				const result = graphToCSR(graph);

				expect(result.csr.nodeCount).toBe(1);
				expect(result.csr.edgeCount).toBe(0);
				expect(result.csr.rowOffsets.length).toBe(2);
				expect(result.csr.rowOffsets[0]).toBe(0);
				expect(result.csr.rowOffsets[1]).toBe(0);
			});

			it("converts a directed graph with one edge", () => {
				const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();
				graph.addNode({ id: "A", label: "Node A" });
				graph.addNode({ id: "B", label: "Node B" });
				graph.addEdge({ source: "A", target: "B", weight: 2.5 });

				const result = graphToCSR(graph);

				expect(result.csr.nodeCount).toBe(2);
				expect(result.csr.edgeCount).toBe(1);

				// Check index mapping
				expect(result.indexMap.nodeToIndex.get("A")).toBe(0);
				expect(result.indexMap.nodeToIndex.get("B")).toBe(1);
				expect(result.indexMap.indexToNode).toEqual(["A", "B"]);

				// Check row offsets
				expect(result.csr.rowOffsets).toEqual(new Uint32Array([0, 1, 1]));

				// Check column indices
				expect(result.csr.colIndices.length).toBe(1);
				expect(result.csr.colIndices[0]).toBe(1); // A points to B (index 1)

				// Check values
				expect(result.csr.values).toBeDefined();
				expect(result.csr.values?.length).toBe(1);
				expect(result.csr.values?.[0]).toBeCloseTo(2.5);
			});

			it("converts a directed graph with multiple edges", () => {
				const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();
				graph.addNode({ id: "A", label: "A" });
				graph.addNode({ id: "B", label: "B" });
				graph.addNode({ id: "C", label: "C" });
				graph.addEdge({ source: "A", target: "B", weight: 1 });
				graph.addEdge({ source: "A", target: "C", weight: 2 });
				graph.addEdge({ source: "B", target: "C", weight: 3 });

				const result = graphToCSR(graph);

				expect(result.csr.nodeCount).toBe(3);
				expect(result.csr.edgeCount).toBe(3);

				// Row offsets: [0, 2, 3, 3]
				// Node A (idx 0): 2 outgoing edges, offset 0-2
				// Node B (idx 1): 1 outgoing edge, offset 2-3
				// Node C (idx 2): 0 outgoing edges, offset 3-3
				expect(result.csr.rowOffsets).toEqual(new Uint32Array([0, 2, 3, 3]));
				expect(result.csr.colIndices.length).toBe(3);
			});

			it("uses default direction 'out' for directed graphs", () => {
				const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();
				graph.addNode({ id: "A", label: "A" });
				graph.addNode({ id: "B", label: "B" });
				graph.addEdge({ source: "B", target: "A", weight: 1 });

				// Default direction is 'out', so A has no outgoing edges
				const result = graphToCSR(graph);

				const aIndex = result.indexMap.nodeToIndex.get("A");
				const bIndex = result.indexMap.nodeToIndex.get("B");

				// B has one outgoing edge to A
				const bStart = result.csr.rowOffsets[bIndex ?? 0] ?? 0;
				const bEnd = result.csr.rowOffsets[(bIndex ?? 0) + 1] ?? 0;
				expect(bEnd - bStart).toBe(1);

				// A has no outgoing edges
				const aStart = result.csr.rowOffsets[aIndex ?? 0] ?? 0;
				const aEnd = result.csr.rowOffsets[(aIndex ?? 0) + 1] ?? 0;
				expect(aEnd - aStart).toBe(0);
			});

			it("respects explicit 'in' direction for directed graphs", () => {
				const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();
				graph.addNode({ id: "A", label: "A" });
				graph.addNode({ id: "B", label: "B" });
				graph.addEdge({ source: "B", target: "A", weight: 1 });

				const result = graphToCSR(graph, "in");

				const aIndex = result.indexMap.nodeToIndex.get("A");
				const bIndex = result.indexMap.nodeToIndex.get("B");

				// A has one incoming edge from B
				const aStart = result.csr.rowOffsets[aIndex ?? 0] ?? 0;
				const aEnd = result.csr.rowOffsets[(aIndex ?? 0) + 1] ?? 0;
				expect(aEnd - aStart).toBe(1);

				// B has no incoming edges
				const bStart = result.csr.rowOffsets[bIndex ?? 0] ?? 0;
				const bEnd = result.csr.rowOffsets[(bIndex ?? 0) + 1] ?? 0;
				expect(bEnd - bStart).toBe(0);
			});

			it("respects 'both' direction for directed graphs", () => {
				const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();
				graph.addNode({ id: "A", label: "A" });
				graph.addNode({ id: "B", label: "B" });
				graph.addNode({ id: "C", label: "C" });
				graph.addEdge({ source: "A", target: "B", weight: 1 });
				graph.addEdge({ source: "C", target: "A", weight: 1 });

				const result = graphToCSR(graph, "both");

				const aIndex = result.indexMap.nodeToIndex.get("A");

				// A has 2 neighbours (B outgoing, C incoming)
				const aStart = result.csr.rowOffsets[aIndex ?? 0] ?? 0;
				const aEnd = result.csr.rowOffsets[(aIndex ?? 0) + 1] ?? 0;
				expect(aEnd - aStart).toBe(2);
			});

			it("uses default weight of 1.0 for edges without weight", () => {
				const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();
				graph.addNode({ id: "A", label: "A" });
				graph.addNode({ id: "B", label: "B" });
				graph.addEdge({ source: "A", target: "B", weight: 1 }); // Weight provided

				const result = graphToCSR(graph);

				expect(result.csr.values?.[0]).toBe(1.0);
			});

			it("handles self-loops in directed graphs", () => {
				const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();
				graph.addNode({ id: "A", label: "A" });
				graph.addEdge({ source: "A", target: "A", weight: 1 });

				const result = graphToCSR(graph);

				expect(result.csr.nodeCount).toBe(1);
				expect(result.csr.edgeCount).toBe(1);
				expect(result.csr.rowOffsets).toEqual(new Uint32Array([0, 1]));
				expect(result.csr.colIndices[0]).toBe(0); // A points to itself
			});
		});

		describe("undirected graph", () => {
			it("converts an empty undirected graph", () => {
				const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
				const result = graphToCSR(graph);

				expect(result.csr.nodeCount).toBe(0);
				expect(result.csr.edgeCount).toBe(0);
			});

			it("stores each undirected edge twice", () => {
				const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
				graph.addNode({ id: "A", label: "A" });
				graph.addNode({ id: "B", label: "B" });
				graph.addEdge({ source: "A", target: "B", weight: 1.5 });

				const result = graphToCSR(graph);

				// One undirected edge = 2 stored entries (A->B and B->A)
				expect(result.csr.edgeCount).toBe(2);
				expect(result.csr.colIndices.length).toBe(2);
			});

			it("uses default direction 'both' for undirected graphs", () => {
				const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
				graph.addNode({ id: "A", label: "A" });
				graph.addNode({ id: "B", label: "B" });
				graph.addNode({ id: "C", label: "C" });
				graph.addEdge({ source: "A", target: "B", weight: 1 });
				graph.addEdge({ source: "B", target: "C", weight: 1 });

				const result = graphToCSR(graph);

				// 2 undirected edges = 4 stored entries
				expect(result.csr.edgeCount).toBe(4);

				// Each node has 2 neighbours (except middle node in chain)
				const aIndex = result.indexMap.nodeToIndex.get("A");
				const aStart = result.csr.rowOffsets[aIndex ?? 0] ?? 0;
				const aEnd = result.csr.rowOffsets[(aIndex ?? 0) + 1] ?? 0;
				expect(aEnd - aStart).toBe(1); // A connected to B only
			});

			it("handles self-loops in undirected graphs", () => {
				const graph = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
				graph.addNode({ id: "A", label: "A" });
				graph.addEdge({ source: "A", target: "A", weight: 1 });

				const result = graphToCSR(graph);

				// Self-loop stored once (not twice since A->A = A->A)
				expect(result.csr.nodeCount).toBe(1);
				expect(result.csr.colIndices.length).toBe(1);
			});
		});

		describe("index mapping", () => {
			it("creates consistent bidirectional mapping", () => {
				const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();
				graph.addNode({ id: "node1", label: "1" });
				graph.addNode({ id: "node2", label: "2" });
				graph.addNode({ id: "node3", label: "3" });

				const result = graphToCSR(graph);

				// nodeToIndex and indexToNode should be consistent
				for (let i = 0; i < result.indexMap.indexToNode.length; i++) {
					const nodeId = result.indexMap.indexToNode[i];
					if (nodeId !== undefined) {
						expect(result.indexMap.nodeToIndex.get(nodeId)).toBe(i);
					}
				}
			});

			it("preserves node iteration order", () => {
				const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();
				const nodeIds = ["alpha", "beta", "gamma"];

				for (const id of nodeIds) {
					graph.addNode({ id, label: id });
				}

				const result = graphToCSR(graph);

				// Index mapping should follow nodeIds() iteration order
				expect(result.indexMap.indexToNode).toEqual(nodeIds);
			});
		});

		describe("types and structure", () => {
			it("returns correct CSRMatrix structure", () => {
				const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();
				graph.addNode({ id: "A", label: "A" });
				graph.addNode({ id: "B", label: "B" });
				graph.addEdge({ source: "A", target: "B", weight: 1 });

				const { csr } = graphToCSR(graph);

				expect(csr.rowOffsets).toBeInstanceOf(Uint32Array);
				expect(csr.colIndices).toBeInstanceOf(Uint32Array);
				expect(csr.values).toBeInstanceOf(Float32Array);
				expect(typeof csr.nodeCount).toBe("number");
				expect(typeof csr.edgeCount).toBe("number");
			});

			it("returns correct CSRIndexMap structure", () => {
				const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();
				graph.addNode({ id: "A", label: "A" });

				const { indexMap } = graphToCSR(graph);

				expect(indexMap.nodeToIndex).toBeInstanceOf(Map);
				expect(Array.isArray(indexMap.indexToNode)).toBe(true);
			});

			it("returns correct CSRGraph structure", () => {
				const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();
				const result = graphToCSR(graph);

				expect("csr" in result).toBe(true);
				expect("indexMap" in result).toBe(true);
			});
		});
	});

	describe("csrToTypedBuffers", () => {
		it("throws if WebGPU is unavailable", async () => {
			const available = isWebGPUAvailable();
			if (!available) {
				await expect(initGPU()).rejects.toThrow(/WebGPU unavailable/);
			}
		});

		describe("with WebGPU available", () => {
			it("creates typed buffers for row offsets and column indices", async () => {
				const available = isWebGPUAvailable();
				if (!available) {
					return; // Skip test
				}

				const root = await initGPU();
				const csr: CSRMatrix = {
					rowOffsets: new Uint32Array([0, 2, 3, 3]),
					colIndices: new Uint32Array([1, 2, 2]),
					nodeCount: 3,
					edgeCount: 3,
				};

				const result = csrToTypedBuffers(root, csr);

				expect(result.rowOffsets).toBeDefined();
				expect(result.colIndices).toBeDefined();
				expect(result.nodeCount).toBe(3);
				expect(result.edgeCount).toBe(3);

				root.destroy();
			});

			it("creates values buffer when values are present", async () => {
				const available = isWebGPUAvailable();
				if (!available) {
					return; // Skip test
				}

				const root = await initGPU();
				const csr: CSRMatrix = {
					rowOffsets: new Uint32Array([0, 1]),
					colIndices: new Uint32Array([0]),
					values: new Float32Array([1.5]),
					nodeCount: 1,
					edgeCount: 1,
				};

				const result = csrToTypedBuffers(root, csr);

				expect(result.values).toBeDefined();

				root.destroy();
			});

			it("omits values buffer when values are undefined", async () => {
				const available = isWebGPUAvailable();
				if (!available) {
					return; // Skip test
				}

				const root = await initGPU();
				const csr: CSRMatrix = {
					rowOffsets: new Uint32Array([0, 1]),
					colIndices: new Uint32Array([0]),
					nodeCount: 1,
					edgeCount: 1,
				};

				const result = csrToTypedBuffers(root, csr);

				expect(result.values).toBeUndefined();

				root.destroy();
			});

			it("returns correct TypedBufferGroup structure", async () => {
				const available = isWebGPUAvailable();
				if (!available) {
					return; // Skip test
				}

				const root = await initGPU();
				const csr: CSRMatrix = {
					rowOffsets: new Uint32Array([0, 0]),
					colIndices: new Uint32Array(),
					nodeCount: 1,
					edgeCount: 0,
				};

				const result = csrToTypedBuffers(root, csr);

				expect("rowOffsets" in result).toBe(true);
				expect("colIndices" in result).toBe(true);
				expect("nodeCount" in result).toBe(true);
				expect("edgeCount" in result).toBe(true);

				root.destroy();
			});

			it("can read back rowOffsets data", async () => {
				const available = isWebGPUAvailable();
				if (!available) {
					return; // Skip test
				}

				const root = await initGPU();
				const csr: CSRMatrix = {
					rowOffsets: new Uint32Array([0, 2, 4]),
					colIndices: new Uint32Array([1, 2, 0, 1]),
					nodeCount: 2,
					edgeCount: 4,
				};

				const result = csrToTypedBuffers(root, csr);

				const readData = await result.rowOffsets.read();
				expect(readData).toBeInstanceOf(Uint32Array);
				expect(readData.length).toBe(3);
				expect(readData[0]).toBe(0);
				expect(readData[1]).toBe(2);
				expect(readData[2]).toBe(4);

				root.destroy();
			});

			it("can read back colIndices data", async () => {
				const available = isWebGPUAvailable();
				if (!available) {
					return; // Skip test
				}

				const root = await initGPU();
				const csr: CSRMatrix = {
					rowOffsets: new Uint32Array([0, 2]),
					colIndices: new Uint32Array([1, 2]),
					nodeCount: 1,
					edgeCount: 2,
				};

				const result = csrToTypedBuffers(root, csr);

				const readData = await result.colIndices.read();
				expect(readData).toBeInstanceOf(Uint32Array);
				expect(readData.length).toBe(2);
				expect(readData[0]).toBe(1);
				expect(readData[1]).toBe(2);

				root.destroy();
			});

			it("can read back values data", async () => {
				const available = isWebGPUAvailable();
				if (!available) {
					return; // Skip test
				}

				const root = await initGPU();
				const csr: CSRMatrix = {
					rowOffsets: new Uint32Array([0, 2]),
					colIndices: new Uint32Array([1, 2]),
					values: new Float32Array([1.5, 2.5]),
					nodeCount: 1,
					edgeCount: 2,
				};

				const result = csrToTypedBuffers(root, csr);

				expect(result.values).toBeDefined();
				if (result.values !== undefined) {
					const readData = await result.values.read();
					expect(readData).toBeInstanceOf(Float32Array);
					expect(readData.length).toBe(2);
					expect(readData[0]).toBeCloseTo(1.5);
					expect(readData[1]).toBeCloseTo(2.5);
				}

				root.destroy();
			});
		});
	});

	describe("integration", () => {
		it("converts a complex directed graph to CSR correctly", () => {
			const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();

			// Create a diamond-shaped graph: A -> B, A -> C, B -> D, C -> D
			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "C", label: "C" });
			graph.addNode({ id: "D", label: "D" });
			graph.addEdge({ source: "A", target: "B", weight: 1 });
			graph.addEdge({ source: "A", target: "C", weight: 2 });
			graph.addEdge({ source: "B", target: "D", weight: 3 });
			graph.addEdge({ source: "C", target: "D", weight: 4 });

			const result = graphToCSR(graph);

			expect(result.csr.nodeCount).toBe(4);
			expect(result.csr.edgeCount).toBe(4);

			// Verify all nodes are mapped
			expect(result.indexMap.nodeToIndex.has("A")).toBe(true);
			expect(result.indexMap.nodeToIndex.has("B")).toBe(true);
			expect(result.indexMap.nodeToIndex.has("C")).toBe(true);
			expect(result.indexMap.nodeToIndex.has("D")).toBe(true);

			// Verify edge weights are stored
			expect(result.csr.values).toBeDefined();
			expect(result.csr.values?.length).toBe(4);
		});

		it("handles a disconnected graph", () => {
			const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();

			// Two disconnected components
			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "C", label: "C" });
			graph.addNode({ id: "D", label: "D" });
			graph.addEdge({ source: "A", target: "B", weight: 1 });
			graph.addEdge({ source: "C", target: "D", weight: 1 });

			const result = graphToCSR(graph);

			expect(result.csr.nodeCount).toBe(4);
			expect(result.csr.edgeCount).toBe(2);
		});

		it("handles isolated nodes", () => {
			const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();

			graph.addNode({ id: "A", label: "A" });
			graph.addNode({ id: "B", label: "B" });
			graph.addNode({ id: "C", label: "C" }); // Isolated
			graph.addEdge({ source: "A", target: "B", weight: 1 });

			const result = graphToCSR(graph);

			expect(result.csr.nodeCount).toBe(3);
			expect(result.csr.edgeCount).toBe(1);

			// C should have 0 neighbours
			const cIndex = result.indexMap.nodeToIndex.get("C");
			const cStart = result.csr.rowOffsets[cIndex ?? 0] ?? 0;
			const cEnd = result.csr.rowOffsets[(cIndex ?? 0) + 1] ?? 0;
			expect(cEnd - cStart).toBe(0);
		});

		describe("with WebGPU available", () => {
			it("end-to-end: graph to CSR to typed buffers", async () => {
				const available = isWebGPUAvailable();
				if (!available) {
					return; // Skip test
				}

				const graph = AdjacencyMapGraph.directed<TestNode, TestEdge>();
				graph.addNode({ id: "A", label: "A" });
				graph.addNode({ id: "B", label: "B" });
				graph.addEdge({ source: "A", target: "B", weight: 1.5 });

				const root = await initGPU();
				const { csr } = graphToCSR(graph);
				const buffers = csrToTypedBuffers(root, csr);

				expect(buffers.nodeCount).toBe(2);
				expect(buffers.edgeCount).toBe(1);

				// Verify data round-trip
				const rowOffsets = await buffers.rowOffsets.read();
				expect(rowOffsets.length).toBe(3);

				root.destroy();
			});
		});
	});
});
