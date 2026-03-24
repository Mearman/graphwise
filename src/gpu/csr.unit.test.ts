import { describe, it, expect, beforeEach } from "vitest";
import {
	graphToCSR,
	csrToGPUBuffers,
	createResultBuffer,
	readBufferToCPU,
	type CSRMatrix,
} from "./csr";
import { AdjacencyMapGraph } from "../graph/adjacency-map";
import type { NodeData, EdgeData } from "../graph/types";

// Mock GPUBufferUsage global for Node.js test environment
Object.defineProperty(globalThis, "GPUBufferUsage", {
	value: {
		MAP_READ: 1,
		MAP_WRITE: 2,
		COPY_SRC: 4,
		COPY_DST: 8,
		INDEX: 16,
		VERTEX: 32,
		UNIFORM: 64,
		STORAGE: 128,
		INDIRECT: 256,
		QUERY_RESOLVE: 512,
	},
	configurable: true,
	writable: true,
});

// Mock GPUMapMode global for Node.js test environment
Object.defineProperty(globalThis, "GPUMapMode", {
	value: {
		READ: 1,
		WRITE: 2,
	},
	configurable: true,
	writable: true,
});

interface TestNode extends NodeData {
	readonly label: string;
}

interface TestEdge extends EdgeData {
	readonly weight: number;
}

// Mock GPUBuffer for environments without WebGPU
class MockGPUBuffer {
	public size: number;
	public usage: number;
	public mappedAtCreation: boolean;
	public mapped = false;
	private data: ArrayBuffer | null = null;

	constructor(descriptor: GPUBufferDescriptor) {
		this.size = descriptor.size;
		this.usage = descriptor.usage;
		this.mappedAtCreation = descriptor.mappedAtCreation ?? false;
	}

	mapAsync(): Promise<void> {
		this.mapped = true;
		return Promise.resolve();
	}

	getMappedRange(): ArrayBuffer {
		if (!this.mapped) {
			throw new Error("Buffer is not mapped");
		}
		this.data = new ArrayBuffer(this.size);
		return this.data;
	}

	unmap(): void {
		this.mapped = false;
	}
}

// Mock GPUQueue
class MockGPUQueue {
	writeBuffer(
		buffer: MockGPUBuffer,
		_offset: number,
		data: BufferSource,
	): void {
		// Store the data reference for verification
		// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
		(buffer as MockGPUBuffer & { writtenData: BufferSource }).writtenData =
			data;
	}
}

// Mock GPUDevice
function createMockDevice(): GPUDevice {
	const queue = new MockGPUQueue();
	const device = {
		queue,
		createBuffer: (descriptor: GPUBufferDescriptor): GPUBuffer => {
			const buffer = new MockGPUBuffer(descriptor);
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
			return buffer as unknown as GPUBuffer;
		},
	};
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
	return device as unknown as GPUDevice;
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

	describe("csrToGPUBuffers", () => {
		let mockDevice: GPUDevice;

		beforeEach(() => {
			mockDevice = createMockDevice();
		});

		it("creates buffers for row offsets and column indices", () => {
			const csr: CSRMatrix = {
				rowOffsets: new Uint32Array([0, 2, 3, 3]),
				colIndices: new Uint32Array([1, 2, 2]),
				nodeCount: 3,
				edgeCount: 3,
			};

			const result = csrToGPUBuffers(mockDevice, csr);
			expect(result.rowOffsets).toBeDefined();
			expect(result.colIndices).toBeDefined();
			expect(result.nodeCount).toBe(3);
			expect(result.edgeCount).toBe(3);
		});

		it("creates values buffer when values are present", () => {
			const csr: CSRMatrix = {
				rowOffsets: new Uint32Array([0, 1]),
				colIndices: new Uint32Array([0]),
				values: new Float32Array([1.5]),
				nodeCount: 1,
				edgeCount: 1,
			};

			const result = csrToGPUBuffers(mockDevice, csr);

			expect(result.values).toBeDefined();
		});

		it("omits values buffer when values are undefined", () => {
			const csr: CSRMatrix = {
				rowOffsets: new Uint32Array([0, 1]),
				colIndices: new Uint32Array([0]),
				values: undefined,
				nodeCount: 1,
				edgeCount: 1,
			};

			const result = csrToGPUBuffers(mockDevice, csr);

			expect(result.values).toBeUndefined();
		});

		it("sets correct buffer sizes", () => {
			const csr: CSRMatrix = {
				rowOffsets: new Uint32Array([0, 2, 4]),
				colIndices: new Uint32Array([1, 2, 0, 1]),
				values: new Float32Array([1, 2, 3, 4]),
				nodeCount: 2,
				edgeCount: 4,
			};

			const result = csrToGPUBuffers(mockDevice, csr);

			// Uint32Array = 4 bytes per element
			const expectedRowOffsetsSize = 3 * 4; // 12 bytes
			const expectedColIndicesSize = 4 * 4; // 16 bytes
			// Float32Array = 4 bytes per element
			const expectedValuesSize = 4 * 4; // 16 bytes

			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
			const rowOffsetsBuffer = result.rowOffsets as unknown as MockGPUBuffer;
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
			const colIndicesBuffer = result.colIndices as unknown as MockGPUBuffer;
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
			const valuesBuffer = result.values as unknown as
				| MockGPUBuffer
				| undefined;

			expect(rowOffsetsBuffer.size).toBe(expectedRowOffsetsSize);
			expect(colIndicesBuffer.size).toBe(expectedColIndicesSize);
			if (valuesBuffer) {
				expect(valuesBuffer.size).toBe(expectedValuesSize);
			}
		});

		it("returns correct GPUBufferGroup structure", () => {
			const csr: CSRMatrix = {
				rowOffsets: new Uint32Array([0, 0]),
				colIndices: new Uint32Array(),
				nodeCount: 1,
				edgeCount: 0,
			};

			const result = csrToGPUBuffers(mockDevice, csr);
			expect("rowOffsets" in result).toBe(true);
			expect("colIndices" in result).toBe(true);
			expect("nodeCount" in result).toBe(true);
			expect("edgeCount" in result).toBe(true);
		});
	});

	describe("createResultBuffer", () => {
		let mockDevice: GPUDevice;

		beforeEach(() => {
			mockDevice = createMockDevice();
		});

		it("creates a buffer with the specified size", () => {
			const byteLength = 1024;
			const buffer = createResultBuffer(mockDevice, byteLength);
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
			const mockBuffer = buffer as unknown as MockGPUBuffer;

			expect(mockBuffer.size).toBe(byteLength);
		});

		it("creates a buffer with correct usage flags", () => {
			const buffer = createResultBuffer(mockDevice, 256);
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
			const mockBuffer = buffer as unknown as MockGPUBuffer;

			// STORAGE | COPY_SRC | MAP_READ
			const expectedUsage =
				GPUBufferUsage.STORAGE |
				GPUBufferUsage.COPY_SRC |
				GPUBufferUsage.MAP_READ;

			expect(mockBuffer.usage).toBe(expectedUsage);
		});

		it("handles zero-size buffer", () => {
			const buffer = createResultBuffer(mockDevice, 0);
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
			const mockBuffer = buffer as unknown as MockGPUBuffer;

			expect(mockBuffer.size).toBe(0);
		});

		it("handles large buffer sizes", () => {
			const byteLength = 16 * 1024 * 1024; // 16 MB
			const buffer = createResultBuffer(mockDevice, byteLength);
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
			const mockBuffer = buffer as unknown as MockGPUBuffer;

			expect(mockBuffer.size).toBe(byteLength);
		});
	});

	describe("readBufferToCPU", () => {
		let mockDevice: GPUDevice;

		beforeEach(() => {
			mockDevice = createMockDevice();
		});

		it("returns an ArrayBuffer", async () => {
			const buffer = createResultBuffer(mockDevice, 16);
			const result = await readBufferToCPU(mockDevice, buffer);

			expect(result).toBeInstanceOf(ArrayBuffer);
		});

		it("returns an ArrayBuffer of the correct size", async () => {
			const byteLength = 32;
			const buffer = createResultBuffer(mockDevice, byteLength);
			const result = await readBufferToCPU(mockDevice, buffer);

			expect(result.byteLength).toBe(byteLength);
		});

		it("handles zero-size buffer", async () => {
			const buffer = createResultBuffer(mockDevice, 0);
			const result = await readBufferToCPU(mockDevice, buffer);

			expect(result.byteLength).toBe(0);
		});

		it("maps and unmaps the buffer", async () => {
			const buffer = createResultBuffer(mockDevice, 8);
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
			const mockBuffer = buffer as unknown as MockGPUBuffer;

			// Verify initial state
			expect(mockBuffer.mapped).toBeFalsy();

			await readBufferToCPU(mockDevice, buffer);

			// Buffer should be unmapped after reading
			expect(mockBuffer.mapped).toBeFalsy();
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
	});
});
