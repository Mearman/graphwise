/**
 * Pure CPU implementation of batch neighbourhood intersection.
 *
 * Computes intersection size and neighbourhood sizes for multiple node pairs.
 * This is the foundation for ALL Jaccard-family MI variants:
 *   J(A,B) = |A ∩ B| / |A ∪ B| = intersection / (sizeA + sizeB - intersection)
 *   Cosine(A,B) = |A ∩ B| / sqrt(|A| * |B|)
 *   Sorensen-Dice(A,B) = 2|A ∩ B| / (|A| + |B|)
 *   Overlap(A,B) = |A ∩ B| / min(|A|, |B|)
 *
 * Uses binary search optimisation: iterate smaller neighbourhood, search in larger.
 *
 * @module gpu/kernels/intersection/logic
 */

/**
 * Result of computing intersection for a single pair.
 */
export interface IntersectionResult {
	/** Size of the intersection |N(u) ∩ N(v)| */
	readonly intersection: number;
	/** Size of first neighbourhood |N(u)| */
	readonly sizeU: number;
	/** Size of second neighbourhood |N(v)| */
	readonly sizeV: number;
}

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
 * Compute intersection stats for a single pair of nodes in CSR format.
 *
 * Neighbours must be sorted (CSR guarantees this from graphToCSR).
 *
 * @param rowOffsets - CSR row offset array
 * @param colIndices - CSR column indices array
 * @param u - First node index
 * @param v - Second node index
 * @returns Intersection result with sizes
 */
export function intersectionPair(
	rowOffsets: Uint32Array,
	colIndices: Uint32Array,
	u: number,
	v: number,
): IntersectionResult {
	const uStart = rowOffsets[u] ?? 0;
	const uEnd = rowOffsets[u + 1] ?? 0;
	const vStart = rowOffsets[v] ?? 0;
	const vEnd = rowOffsets[v + 1] ?? 0;

	const sizeU = uEnd - uStart;
	const sizeV = vEnd - vStart;

	// Empty neighbourhoods → intersection = 0
	if (sizeU === 0 || sizeV === 0) {
		return { intersection: 0, sizeU, sizeV };
	}

	// Count intersection by iterating smaller neighbourhood, binary searching in larger
	let intersection = 0;

	if (sizeU <= sizeV) {
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

	return { intersection, sizeU, sizeV };
}

/**
 * Batch intersection stats for multiple node pairs.
 *
 * @param rowOffsets - CSR row offset array
 * @param colIndices - CSR column indices array
 * @param pairs - Array of [u, v] node index pairs
 * @returns Object with parallel arrays: intersections, sizeUs, sizeVs
 */
export function intersectionBatch(
	rowOffsets: Uint32Array,
	colIndices: Uint32Array,
	pairs: readonly (readonly [number, number])[],
): {
	intersections: Uint32Array;
	sizeUs: Uint32Array;
	sizeVs: Uint32Array;
} {
	const n = pairs.length;
	const intersections = new Uint32Array(n);
	const sizeUs = new Uint32Array(n);
	const sizeVs = new Uint32Array(n);

	for (let i = 0; i < n; i++) {
		const pair = pairs[i];
		if (pair !== undefined) {
			const [u, v] = pair;
			const result = intersectionPair(rowOffsets, colIndices, u, v);
			intersections[i] = result.intersection;
			sizeUs[i] = result.sizeU;
			sizeVs[i] = result.sizeV;
		}
	}

	return { intersections, sizeUs, sizeVs };
}

/**
 * Compute Jaccard from intersection stats.
 * J = intersection / (sizeU + sizeV - intersection)
 */
export function jaccardFromIntersection(result: IntersectionResult): number {
	const union = result.sizeU + result.sizeV - result.intersection;
	return union === 0 ? 0 : result.intersection / union;
}

/**
 * Compute Cosine similarity from intersection stats.
 * Cosine = intersection / sqrt(sizeU * sizeV)
 */
export function cosineFromIntersection(result: IntersectionResult): number {
	const denominator = Math.sqrt(result.sizeU * result.sizeV);
	return denominator === 0 ? 0 : result.intersection / denominator;
}

/**
 * Compute Sorensen-Dice from intersection stats.
 * SD = 2 * intersection / (sizeU + sizeV)
 */
export function sorensenDiceFromIntersection(
	result: IntersectionResult,
): number {
	const denominator = result.sizeU + result.sizeV;
	return denominator === 0 ? 0 : (2 * result.intersection) / denominator;
}

/**
 * Compute Overlap coefficient from intersection stats.
 * Overlap = intersection / min(sizeU, sizeV)
 */
export function overlapFromIntersection(result: IntersectionResult): number {
	const minSize = Math.min(result.sizeU, result.sizeV);
	return minSize === 0 ? 0 : result.intersection / minSize;
}

/**
 * Compute Hub Promoted from intersection stats.
 * HP = intersection / min(sizeU, sizeV)
 * Note: Same formula as Overlap coefficient
 */
export function hubPromotedFromIntersection(
	result: IntersectionResult,
): number {
	return overlapFromIntersection(result);
}
