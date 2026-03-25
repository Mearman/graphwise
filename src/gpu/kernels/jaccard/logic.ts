/**
 * Pure CPU implementation of batch Jaccard similarity.
 *
 * Computes Jaccard coefficient for multiple node pairs in parallel:
 *   J(u, v) = |N(u) ∩ N(v)| / |N(u) ∪ N(v)|
 *
 * This is the CPU reference implementation extracted from the WGSL kernel.
 * Uses binary search optimisation: iterate smaller neighbourhood, search in larger.
 *
 * @module gpu/kernels/jaccard/logic
 */

/**
 * Binary search in a sorted subarray of colIndices.
 *
 * @param colIndices - CSR column indices array (must be sorted per row)
 * @param start - Start index (inclusive)
 * @param end - End index (exclusive)
 * @param target - Value to search for
 * @returns true if target is found between colIndices[start] and colIndices[end-1]
 */
export function binarySearch(
	colIndices: Uint32Array,
	start: number,
	end: number,
	target: number,
): boolean {
	let lo = start;
	let hi = end;

	while (lo < hi) {
		const mid = lo + Math.floor((hi - lo) / 2);
		const midVal = colIndices[mid] ?? 0;

		if (midVal === target) {
			return true;
		} else if (midVal < target) {
			lo = mid + 1;
		} else {
			hi = mid;
		}
	}

	return false;
}

/**
 * Compute Jaccard similarity for a single pair of nodes in CSR format.
 *
 * Neighbours must be sorted (CSR guarantees this from graphToCSR).
 *
 * @param rowOffsets - CSR row offset array
 * @param colIndices - CSR column indices array
 * @param u - First node index
 * @param v - Second node index
 * @returns Jaccard coefficient in [0, 1]
 */
export function jaccardPair(
	rowOffsets: Uint32Array,
	colIndices: Uint32Array,
	u: number,
	v: number,
): number {
	const uStart = rowOffsets[u] ?? 0;
	const uEnd = rowOffsets[u + 1] ?? 0;
	const vStart = rowOffsets[v] ?? 0;
	const vEnd = rowOffsets[v + 1] ?? 0;

	const degU = uEnd - uStart;
	const degV = vEnd - vStart;

	// Empty neighbourhoods → Jaccard = 0
	if (degU === 0 || degV === 0) {
		return 0.0;
	}

	// Count intersection by iterating smaller neighbourhood, binary searching in larger
	let intersection = 0;

	if (degU <= degV) {
		// Iterate u's neighbours, search in v's
		for (let i = uStart; i < uEnd; i++) {
			const neighbour = colIndices[i] ?? 0;
			if (binarySearch(colIndices, vStart, vEnd, neighbour)) {
				intersection++;
			}
		}
	} else {
		// Iterate v's neighbours, search in u's
		for (let i = vStart; i < vEnd; i++) {
			const neighbour = colIndices[i] ?? 0;
			if (binarySearch(colIndices, uStart, uEnd, neighbour)) {
				intersection++;
			}
		}
	}

	// Jaccard = intersection / union
	const unionSize = degU + degV - intersection;
	return intersection / unionSize;
}

/**
 * Batch Jaccard similarity for multiple node pairs.
 *
 * @param rowOffsets - CSR row offset array
 * @param colIndices - CSR column indices array
 * @param pairs - Array of [u, v] node index pairs
 * @returns Float32Array of Jaccard coefficients, one per pair
 */
export function jaccardBatch(
	rowOffsets: Uint32Array,
	colIndices: Uint32Array,
	pairs: readonly (readonly [number, number])[],
): Float32Array {
	const results = new Float32Array(pairs.length);

	for (let i = 0; i < pairs.length; i++) {
		const pair = pairs[i];
		if (pair !== undefined) {
			const [u, v] = pair;
			results[i] = jaccardPair(rowOffsets, colIndices, u, v);
		}
	}

	return results;
}
