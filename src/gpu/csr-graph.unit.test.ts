import { describe, it, expect } from "vitest";
import { CSRReadableGraph } from "./csr-graph";
import { AdjacencyMapGraph } from "../graph";

describe("CSRReadableGraph", () => {
	describe("construction", () => {
		it("creates CSR graph from empty graph", () => {
			const graph = AdjacencyMapGraph.directed();
			const csr = CSRReadableGraph.from(graph);

			expect(csr.nodeCount).toBe(0);
			expect(csr.edgeCount).toBe(0);
			expect(csr.directed).toBe(true);
		});

		it("creates CSR graph from simple directed graph", () => {
			const graph = AdjacencyMapGraph.directed();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addNode({ id: "C" });
			graph.addEdge({ source: "A", target: "B" });
			graph.addEdge({ source: "A", target: "C" });
			graph.addEdge({ source: "B", target: "C" });

			const csr = CSRReadableGraph.from(graph);

			expect(csr.nodeCount).toBe(3);
			expect(csr.edgeCount).toBe(3);
			expect(csr.directed).toBe(true);
		});

		it("creates CSR graph from undirected graph", () => {
			const graph = AdjacencyMapGraph.undirected();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addEdge({ source: "A", target: "B" });

			const csr = CSRReadableGraph.from(graph);

			expect(csr.nodeCount).toBe(2);
			expect(csr.edgeCount).toBe(2); // Undirected edges counted in both directions
			expect(csr.directed).toBe(false);
		});
	});

	describe("hasNode", () => {
		it("returns true for existing nodes", () => {
			const graph = AdjacencyMapGraph.directed();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });

			const csr = CSRReadableGraph.from(graph);

			expect(csr.hasNode("A")).toBe(true);
			expect(csr.hasNode("B")).toBe(true);
		});

		it("returns false for non-existing nodes", () => {
			const graph = AdjacencyMapGraph.directed();
			graph.addNode({ id: "A" });

			const csr = CSRReadableGraph.from(graph);

			expect(csr.hasNode("Z")).toBe(false);
		});
	});

	describe("nodeIds", () => {
		it("iterates all node IDs", () => {
			const graph = AdjacencyMapGraph.directed();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addNode({ id: "C" });

			const csr = CSRReadableGraph.from(graph);
			const nodeIds = [...csr.nodeIds()];

			expect(nodeIds).toEqual(["A", "B", "C"]);
		});

		it("returns empty iterable for empty graph", () => {
			const graph = AdjacencyMapGraph.directed();
			const csr = CSRReadableGraph.from(graph);
			const nodeIds = [...csr.nodeIds()];

			expect(nodeIds).toEqual([]);
		});
	});

	describe("neighbours", () => {
		it("returns neighbours in directed graph", () => {
			const graph = AdjacencyMapGraph.directed();
			["A", "B", "C", "D"].forEach((id) => graph.addNode({ id }));
			graph.addEdge({ source: "A", target: "B" });
			graph.addEdge({ source: "A", target: "C" });
			graph.addEdge({ source: "B", target: "A" });

			const csr = CSRReadableGraph.from(graph);

			expect([...csr.neighbours("A", "out")]).toEqual(["B", "C"]);
			expect([...csr.neighbours("B", "out")]).toEqual(["A"]);
			expect([...csr.neighbours("C", "out")]).toEqual([]);
			expect([...csr.neighbours("D", "out")]).toEqual([]);
		});

		it("returns neighbours in undirected graph", () => {
			const graph = AdjacencyMapGraph.undirected();
			["A", "B", "C"].forEach((id) => graph.addNode({ id }));
			graph.addEdge({ source: "A", target: "B" });
			graph.addEdge({ source: "A", target: "C" });

			const csr = CSRReadableGraph.from(graph);

			expect(new Set(csr.neighbours("A"))).toEqual(new Set(["B", "C"]));
			expect(new Set(csr.neighbours("B"))).toEqual(new Set(["A"]));
			expect(new Set(csr.neighbours("C"))).toEqual(new Set(["A"]));
		});

		it("returns empty for non-existent node", () => {
			const graph = AdjacencyMapGraph.directed();
			graph.addNode({ id: "A" });

			const csr = CSRReadableGraph.from(graph);

			expect([...csr.neighbours("Z")]).toEqual([]);
		});
	});

	describe("degree", () => {
		it("computes degree correctly for directed graph", () => {
			const graph = AdjacencyMapGraph.directed();
			["A", "B", "C"].forEach((id) => graph.addNode({ id }));
			graph.addEdge({ source: "A", target: "B" });
			graph.addEdge({ source: "A", target: "C" });
			graph.addEdge({ source: "B", target: "A" });

			const csr = CSRReadableGraph.from(graph);

			expect(csr.degree("A", "out")).toBe(2);
			expect(csr.degree("B", "out")).toBe(1);
			expect(csr.degree("C", "out")).toBe(0);
		});

		it("computes degree correctly for undirected graph", () => {
			const graph = AdjacencyMapGraph.undirected();
			["A", "B", "C"].forEach((id) => graph.addNode({ id }));
			graph.addEdge({ source: "A", target: "B" });
			graph.addEdge({ source: "A", target: "C" });

			const csr = CSRReadableGraph.from(graph);

			expect(csr.degree("A")).toBe(2);
			expect(csr.degree("B")).toBe(1);
			expect(csr.degree("C")).toBe(1);
		});

		it("returns 0 for non-existent node", () => {
			const graph = AdjacencyMapGraph.directed();
			graph.addNode({ id: "A" });

			const csr = CSRReadableGraph.from(graph);

			expect(csr.degree("Z")).toBe(0);
		});
	});

	describe("getNode and getEdge", () => {
		it("returns undefined for getNode (topology-only)", () => {
			const graph = AdjacencyMapGraph.directed();
			graph.addNode({ id: "A", type: "custom" });

			const csr = CSRReadableGraph.from(graph);
			// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
			const node = csr.getNode("A");

			expect(node).toBeUndefined();
		});

		it("returns undefined for getEdge (topology-only)", () => {
			const graph = AdjacencyMapGraph.directed();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addEdge({ source: "A", target: "B", type: "custom" });

			const csr = CSRReadableGraph.from(graph);
			// eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
			const edge = csr.getEdge("A", "B");

			expect(edge).toBeUndefined();
		});
	});

	describe("edges", () => {
		it("returns empty iterable (no edge data stored)", () => {
			const graph = AdjacencyMapGraph.directed();
			graph.addNode({ id: "A" });
			graph.addNode({ id: "B" });
			graph.addEdge({ source: "A", target: "B" });

			const csr = CSRReadableGraph.from(graph);
			const edges = [...csr.edges()];

			expect(edges).toEqual([]);
		});
	});

	describe("consistency with original graph", () => {
		it("preserves topology for directed graph", () => {
			const graph = AdjacencyMapGraph.directed();
			["A", "B", "C", "D"].forEach((id) => graph.addNode({ id }));
			graph.addEdge({ source: "A", target: "B" });
			graph.addEdge({ source: "A", target: "C" });
			graph.addEdge({ source: "B", target: "D" });
			graph.addEdge({ source: "C", target: "D" });

			const csr = CSRReadableGraph.from(graph);

			// Check node count and edge count
			expect(csr.nodeCount).toBe(graph.nodeCount);
			expect(csr.edgeCount).toBe(graph.edgeCount);

			// Check all nodes exist
			for (const nodeId of graph.nodeIds()) {
				expect(csr.hasNode(nodeId)).toBe(true);
				expect(csr.degree(nodeId, "out")).toBe(graph.degree(nodeId, "out"));
			}

			// Check all neighbours match
			for (const nodeId of graph.nodeIds()) {
				const origNeighbours = new Set(graph.neighbours(nodeId, "out"));
				const csrNeighbours = new Set(csr.neighbours(nodeId, "out"));
				expect(csrNeighbours).toEqual(origNeighbours);
			}
		});

		it("preserves topology for undirected graph", () => {
			const graph = AdjacencyMapGraph.undirected();
			["A", "B", "C"].forEach((id) => graph.addNode({ id }));
			graph.addEdge({ source: "A", target: "B" });
			graph.addEdge({ source: "B", target: "C" });

			const csr = CSRReadableGraph.from(graph);

			expect(csr.nodeCount).toBe(graph.nodeCount);

			for (const nodeId of graph.nodeIds()) {
				expect(csr.degree(nodeId)).toBe(graph.degree(nodeId));
				const origNeighbours = new Set(graph.neighbours(nodeId));
				const csrNeighbours = new Set(csr.neighbours(nodeId));
				expect(csrNeighbours).toEqual(origNeighbours);
			}
		});
	});

	describe("data access", () => {
		it("provides access to underlying CSR structures", () => {
			const graph = AdjacencyMapGraph.directed();
			["A", "B", "C"].forEach((id) => graph.addNode({ id }));
			graph.addEdge({ source: "A", target: "B" });
			graph.addEdge({ source: "A", target: "C" });

			const csr = CSRReadableGraph.from(graph);
			const { csr: csrData, indexMap } = csr.data;

			expect(csrData.nodeCount).toBe(3);
			expect(csrData.rowOffsets.length).toBe(4); // nodeCount + 1
			expect(csrData.colIndices.length).toBe(2); // edge count
			expect(indexMap.indexToNode.length).toBe(3);
		});
	});
});
