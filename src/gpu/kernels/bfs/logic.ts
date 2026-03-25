/**
 * Pure CPU implementation of level-synchronous BFS.
 *
 * Processes one BFS level per iteration:
 *   - For each node in the current frontier:
 *     - For each neighbour:
 *       - If not yet visited, mark visited, add to next frontier, set level
 *
 * This is the CPU reference implementation extracted from the WGSL kernel.
 *
 * @module gpu/kernels/bfs/logic
 */

/**
 * Result of a BFS traversal.
 */
export interface BfsResult {
	/** Level (distance from source) for each node. -1 if unreachable. */
	readonly levels: Int32Array;
	/** Number of BFS levels (maximum distance + 1). */
	readonly depth: number;
	/** Number of nodes reached. */
	readonly nodesReached: number;
}

/**
 * Process one BFS level: expand frontier and return next frontier.
 * This mirrors one dispatch of the GPU kernel.
 *
 * @param rowOffsets - CSR row offsets
 * @param colIndices - CSR column indices
 * @param frontier - Current frontier node indices
 * @param visited - Visited flags (mutated in place)
 * @param levels - Level assignments (mutated in place)
 * @param currentLevel - Current BFS level
 * @returns Next frontier node indices
 */
export function bfsLevel(
	rowOffsets: Uint32Array,
	colIndices: Uint32Array,
	frontier: readonly number[],
	visited: Uint8Array,
	levels: Int32Array,
	currentLevel: number,
): number[] {
	const nextFrontier: number[] = [];

	for (const node of frontier) {
		const start = rowOffsets[node] ?? 0;
		const end = rowOffsets[node + 1] ?? 0;

		for (let i = start; i < end; i++) {
			const neighbour = colIndices[i] ?? 0;

			// If not yet visited, mark and add to next frontier
			if ((visited[neighbour] ?? 0) === 0) {
				visited[neighbour] = 1;
				levels[neighbour] = currentLevel + 1;
				nextFrontier.push(neighbour);
			}
		}
	}

	return nextFrontier;
}

/**
 * Full BFS from a source node.
 *
 * @param rowOffsets - CSR row offsets
 * @param colIndices - CSR column indices
 * @param nodeCount - Number of nodes
 * @param source - Source node index
 * @returns BFS result with levels and statistics
 */
export function bfs(
	rowOffsets: Uint32Array,
	colIndices: Uint32Array,
	nodeCount: number,
	source: number,
): BfsResult {
	// Initialise: -1 means unreachable
	const levels = new Int32Array(nodeCount).fill(-1);
	const visited = new Uint8Array(nodeCount);

	// Handle empty graph
	if (nodeCount === 0) {
		return {
			levels,
			depth: 0,
			nodesReached: 0,
		};
	}

	// Start from source
	levels[source] = 0;
	visited[source] = 1;
	let frontier: number[] = [source];
	let currentLevel = 0;
	let nodesReached = 1;

	// Expand until frontier is empty
	while (frontier.length > 0) {
		frontier = bfsLevel(
			rowOffsets,
			colIndices,
			frontier,
			visited,
			levels,
			currentLevel,
		);
		nodesReached += frontier.length;
		currentLevel++;
	}

	return {
		levels,
		depth: currentLevel,
		nodesReached,
	};
}
