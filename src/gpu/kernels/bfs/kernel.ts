/**
 * TypeGPU compute kernel for level-synchronous BFS.
 *
 * Processes one BFS level per dispatch:
 *   - For each node in the current frontier:
 *     - For each neighbour:
 *       - If not yet visited, mark visited and set level
 *
 * Multiple dispatches needed to propagate through all levels.
 *
 * @module gpu/kernels/bfs/kernel
 */

import tgpu, { d, type StorageFlag, type TgpuBuffer } from "typegpu";
import type { TypedBufferGroup } from "../../csr";
import type { GraphwiseGPURoot } from "../../root";

/**
 * Bind group layout for BFS kernel.
 */
const BFSLayout = tgpu.bindGroupLayout({
	rowOffsets: { storage: d.arrayOf(d.u32) },
	colIndices: { storage: d.arrayOf(d.u32) },
	frontier: { storage: d.arrayOf(d.u32) },
	frontierSize: { uniform: d.u32 },
	visited: { storage: d.arrayOf(d.u32), access: "mutable" },
	levels: { storage: d.arrayOf(d.i32), access: "mutable" },
	nextFrontier: { storage: d.arrayOf(d.u32), access: "mutable" },
	nextFrontierSize: { storage: d.arrayOf(d.u32), access: "mutable" },
	currentLevel: { uniform: d.u32 },
	nodeCount: { uniform: d.u32 },
});

/**
 * BFS level exploration pipeline: one thread per frontier node.
 *
 * Each thread:
 *   1. Reads its frontier node
 *   2. Iterates neighbours
 *   3. For unvisited neighbours: marks visited, sets level, appends to next frontier
 *
 * Note: Without atomics, this can race on nextFrontierSize. Use carefully.
 */
const bfsPipeline = (threadId: number): void => {
	"use gpu";
	const frontierLen = BFSLayout.$.frontierSize ?? 0;

	if (threadId >= frontierLen) {
		return;
	}

	const node = BFSLayout.$.frontier[threadId] ?? 0;
	const currentLvl = BFSLayout.$.currentLevel ?? 0;

	const start = BFSLayout.$.rowOffsets[node] ?? 0;
	const end = BFSLayout.$.rowOffsets[node + 1] ?? 0;

	for (let i = start; i < end; i = i + 1) {
		const neighbour = BFSLayout.$.colIndices[i] ?? 0;

		// Check if already visited (visited[neighbour] != 0)
		const isVisited = BFSLayout.$.visited[neighbour] ?? 0;
		if (isVisited === 0) {
			// Mark visited
			BFSLayout.$.visited[neighbour] = 1;
			// Set level
			BFSLayout.$.levels[neighbour] = currentLvl + 1;

			// Append to next frontier (atomic increment would be ideal)
			// For now, use a simple offset based on thread ID
			const nextSize = BFSLayout.$.nextFrontierSize[0] ?? 0;
			BFSLayout.$.nextFrontier[nextSize + threadId] = neighbour;
		}
	}
};

/**
 * Dispatch one BFS level on GPU.
 *
 * @param root - TypeGPU root instance
 * @param csrBuffers - CSR matrix as typed buffers
 * @param frontier - Current frontier nodes (u32 array)
 * @param frontierSize - Number of nodes in current frontier
 * @param visited - Visited flags (u32 array, mutable)
 * @param levels - Level assignments (i32 array, mutable)
 * @param nextFrontier - Output next frontier (u32 array, mutable)
 * @param nextFrontierSize - Output next frontier size (u32 array, mutable)
 * @param currentLevel - Current BFS level (0-indexed)
 * @param nodeCount - Total number of nodes
 */
export function dispatchBfsLevel(
	root: GraphwiseGPURoot,
	csrBuffers: TypedBufferGroup,
	frontier: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.u32>>> &
		StorageFlag,
	frontierSize: number,
	visited: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.u32>>> & StorageFlag,
	levels: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.i32>>> & StorageFlag,
	nextFrontier: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.u32>>> &
		StorageFlag,
	nextFrontierSize: TgpuBuffer<ReturnType<typeof d.arrayOf<typeof d.u32>>> &
		StorageFlag,
	currentLevel: number,
	nodeCount: number,
): void {
	const pipeline = root.createGuardedComputePipeline(bfsPipeline);

	const frontierSizeBuffer = root
		.createBuffer(d.u32, frontierSize)
		.$usage("uniform");
	const currentLevelBuffer = root
		.createBuffer(d.u32, currentLevel)
		.$usage("uniform");
	const nodeCountBuffer = root.createBuffer(d.u32, nodeCount).$usage("uniform");

	const bindGroup = root.createBindGroup(BFSLayout, {
		rowOffsets: csrBuffers.rowOffsets,
		colIndices: csrBuffers.colIndices,
		frontier,
		frontierSize: frontierSizeBuffer,
		visited,
		levels,
		nextFrontier,
		nextFrontierSize,
		currentLevel: currentLevelBuffer,
		nodeCount: nodeCountBuffer,
	});

	pipeline.with(bindGroup).dispatchThreads(frontierSize);
}

export { BFSLayout };
