/**
 * Pure CPU implementation of PageRank power iteration.
 *
 * Computes one iteration of PageRank:
 *   r(v) = (1 - d)/N + d * sum(r(u) / deg_out(u)) for u -> v
 *
 * This is the CPU reference implementation extracted from the WGSL kernel.
 * The CSR stores the transpose graph (in-edges as rows).
 *
 * @module gpu/kernels/pagerank/logic
 */

/** Default damping factor */
const DEFAULT_DAMPING = 0.85;

/** Default maximum iterations */
const DEFAULT_MAX_ITERATIONS = 100;

/** Default convergence tolerance */
const DEFAULT_TOLERANCE = 1e-6;

/**
 * Compute one node's PageRank contribution from its incoming neighbours.
 *
 * @param rowOffsets - CSR row offset array (transpose graph: in-edges)
 * @param colIndices - CSR column indices array
 * @param ranks - Current rank values
 * @param outDegrees - Out-degree for each node
 * @param node - Node index to compute
 * @param damping - Damping factor (typically 0.85)
 * @param n - Total number of nodes
 * @returns New rank for this node
 */
export function pagerankNode(
	rowOffsets: Uint32Array,
	colIndices: Uint32Array,
	ranks: Float32Array,
	outDegrees: Uint32Array,
	node: number,
	damping: number,
	n: number,
): number {
	const start = rowOffsets[node] ?? 0;
	const end = rowOffsets[node + 1] ?? 0;

	let contribution = 0.0;

	for (let i = start; i < end; i++) {
		const source = colIndices[i] ?? 0;
		const deg = outDegrees[source] ?? 0;
		if (deg > 0) {
			contribution += (ranks[source] ?? 0) / deg;
		}
	}

	const teleport = (1.0 - damping) / n;
	return teleport + damping * contribution;
}

/**
 * Full PageRank power iteration: compute new ranks from current ranks.
 *
 * @param rowOffsets - CSR row offset array (transpose graph)
 * @param colIndices - CSR column indices array
 * @param ranks - Current rank values (will be read, not modified)
 * @param outDegrees - Out-degree for each node
 * @param damping - Damping factor (typically 0.85)
 * @param n - Total number of nodes
 * @returns New rank values after one iteration
 */
export function pagerankIteration(
	rowOffsets: Uint32Array,
	colIndices: Uint32Array,
	ranks: Float32Array,
	outDegrees: Uint32Array,
	damping: number,
	n: number,
): Float32Array {
	const newRanks = new Float32Array(n);

	for (let node = 0; node < n; node++) {
		newRanks[node] = pagerankNode(
			rowOffsets,
			colIndices,
			ranks,
			outDegrees,
			node,
			damping,
			n,
		);
	}

	return newRanks;
}

/**
 * Run multiple PageRank iterations until convergence or maxIterations.
 *
 * @param rowOffsets - CSR row offset array (transpose graph)
 * @param colIndices - CSR column indices array
 * @param outDegrees - Out-degree for each node
 * @param n - Total number of nodes
 * @param damping - Damping factor (default: 0.85)
 * @param maxIterations - Maximum iterations (default: 100)
 * @param tolerance - Convergence tolerance (default: 1e-6)
 * @returns Final rank values
 */
export function pagerank(
	rowOffsets: Uint32Array,
	colIndices: Uint32Array,
	outDegrees: Uint32Array,
	n: number,
	damping: number = DEFAULT_DAMPING,
	maxIterations: number = DEFAULT_MAX_ITERATIONS,
	tolerance: number = DEFAULT_TOLERANCE,
): Float32Array {
	// Initialise with uniform distribution
	let ranks: Float32Array = new Float32Array(n).fill(1.0 / n);

	for (let iter = 0; iter < maxIterations; iter++) {
		const newRanks = pagerankIteration(
			rowOffsets,
			colIndices,
			ranks,
			outDegrees,
			damping,
			n,
		);

		// Check convergence (L1 norm)
		let diff = 0.0;
		for (let i = 0; i < n; i++) {
			diff += Math.abs((newRanks[i] ?? 0) - (ranks[i] ?? 0));
		}

		ranks = newRanks;

		if (diff < tolerance) {
			break;
		}
	}

	return ranks;
}
