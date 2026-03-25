import { describe, it, expect } from "vitest";
import {
	binarySearch,
	intersectionPair,
	intersectionBatch,
	jaccardFromIntersection,
	cosineFromIntersection,
	sorensenDiceFromIntersection,
	overlapFromIntersection,
	type IntersectionResult,
} from "./logic";

/**
 * Helper to create CSR arrays from adjacency list.
 * Ensures neighbours are sorted (required for binary search).
 */
function adjacencyToCSR(adj: Map<number, number[]>): {
	rowOffsets: Uint32Array;
	colIndices: Uint32Array;
} {
	const nodes = [...adj.keys()].sort((a, b) => a - b);
	const n = nodes.length > 0 ? Math.max(...nodes) + 1 : 0;

	const rowOffsets = new Uint32Array(n + 1);
	const colIndices: number[] = [];

	for (let i = 0; i < n; i++) {
		rowOffsets[i] = colIndices.length;
		const neighbours = (adj.get(i) ?? []).sort((a, b) => a - b);
		colIndices.push(...neighbours);
	}
	rowOffsets[n] = colIndices.length;

	return { rowOffsets, colIndices: new Uint32Array(colIndices) };
}

describe("binarySearch", () => {
	it("should find existing elements", () => {
		const arr = new Uint32Array([1, 3, 5, 7, 9, 11, 13]);
		expect(binarySearch(arr, 0, 7, 1)).toBe(true);
		expect(binarySearch(arr, 0, 7, 7)).toBe(true);
		expect(binarySearch(arr, 0, 7, 13)).toBe(true);
	});

	it("should not find missing elements", () => {
		const arr = new Uint32Array([1, 3, 5, 7, 9, 11, 13]);
		expect(binarySearch(arr, 0, 7, 0)).toBe(false);
		expect(binarySearch(arr, 0, 7, 6)).toBe(false);
		expect(binarySearch(arr, 0, 7, 14)).toBe(false);
	});

	it("should handle empty range", () => {
		const arr = new Uint32Array([1, 2, 3]);
		expect(binarySearch(arr, 0, 0, 1)).toBe(false);
		expect(binarySearch(arr, 2, 2, 3)).toBe(false);
	});

	it("should handle single element range", () => {
		const arr = new Uint32Array([1, 2, 3]);
		expect(binarySearch(arr, 1, 2, 2)).toBe(true);
		expect(binarySearch(arr, 1, 2, 1)).toBe(false);
		expect(binarySearch(arr, 1, 2, 3)).toBe(false);
	});

	it("should respect start and end bounds", () => {
		const arr = new Uint32Array([1, 2, 3, 4, 5]);
		// Search only in [3, 4, 5]
		expect(binarySearch(arr, 2, 5, 3)).toBe(true);
		expect(binarySearch(arr, 2, 5, 4)).toBe(true);
		expect(binarySearch(arr, 2, 5, 5)).toBe(true);
		// 1 and 2 are outside the search range
		expect(binarySearch(arr, 2, 5, 1)).toBe(false);
		expect(binarySearch(arr, 2, 5, 2)).toBe(false);
	});
});

describe("intersectionPair", () => {
	it("should compute intersection for nodes with shared neighbours", () => {
		// Node 0: [1, 2, 3]
		// Node 1: [0, 2, 4]
		// Intersection of 0-1: {2} → intersection=1
		const adj = new Map([
			[0, [1, 2, 3]],
			[1, [0, 2, 4]],
		]);
		const { rowOffsets, colIndices } = adjacencyToCSR(adj);

		const result = intersectionPair(rowOffsets, colIndices, 0, 1);
		expect(result.intersection).toBe(1);
		expect(result.sizeU).toBe(3);
		expect(result.sizeV).toBe(3);
	});

	it("should handle nodes with no common neighbours", () => {
		// Node 0: [1, 2]
		// Node 3: [4, 5]
		// Intersection of 0-3: empty → intersection=0
		const adj = new Map([
			[0, [1, 2]],
			[3, [4, 5]],
		]);
		const { rowOffsets, colIndices } = adjacencyToCSR(adj);

		const result = intersectionPair(rowOffsets, colIndices, 0, 3);
		expect(result.intersection).toBe(0);
		expect(result.sizeU).toBe(2);
		expect(result.sizeV).toBe(2);
	});

	it("should handle identical neighbourhoods", () => {
		// Node 0: [1, 2, 3]
		// Node 4: [1, 2, 3]
		// Intersection of 0-4: {1, 2, 3} → intersection=3
		const adj = new Map([
			[0, [1, 2, 3]],
			[4, [1, 2, 3]],
		]);
		const { rowOffsets, colIndices } = adjacencyToCSR(adj);

		const result = intersectionPair(rowOffsets, colIndices, 0, 4);
		expect(result.intersection).toBe(3);
		expect(result.sizeU).toBe(3);
		expect(result.sizeV).toBe(3);
	});

	it("should handle empty neighbourhoods", () => {
		// Node 0: []
		// Node 1: [2, 3]
		const adj = new Map([
			[0, []],
			[1, [2, 3]],
		]);
		const { rowOffsets, colIndices } = adjacencyToCSR(adj);

		const result = intersectionPair(rowOffsets, colIndices, 0, 1);
		expect(result.intersection).toBe(0);
		expect(result.sizeU).toBe(0);
		expect(result.sizeV).toBe(2);
	});

	it("should handle asymmetric degrees efficiently", () => {
		// Node 0: [1] (small)
		// Node 1: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] (large, includes 1)
		// Intersection of 0-1: {1} → intersection=1
		// Should iterate small neighbourhood (1 element) and binary search large
		const adj = new Map([
			[0, [1]],
			[1, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]],
		]);
		const { rowOffsets, colIndices } = adjacencyToCSR(adj);

		const result = intersectionPair(rowOffsets, colIndices, 0, 1);
		expect(result.intersection).toBe(1);
		expect(result.sizeU).toBe(1);
		expect(result.sizeV).toBe(10);
	});

	it("should handle self-intersection", () => {
		// Node 0: [1, 2, 3]
		const adj = new Map([[0, [1, 2, 3]]]);
		const { rowOffsets, colIndices } = adjacencyToCSR(adj);

		const result = intersectionPair(rowOffsets, colIndices, 0, 0);
		expect(result.intersection).toBe(3);
		expect(result.sizeU).toBe(3);
		expect(result.sizeV).toBe(3);
	});
});

describe("intersectionBatch", () => {
	it("should compute intersections for multiple pairs", () => {
		// Node 0: [1, 2]
		// Node 1: [0, 2]
		// Node 2: [0, 1, 3]
		// Node 3: [2]
		const adj = new Map([
			[0, [1, 2]],
			[1, [0, 2]],
			[2, [0, 1, 3]],
			[3, [2]],
		]);
		const { rowOffsets, colIndices } = adjacencyToCSR(adj);

		const pairs: (readonly [number, number])[] = [
			[0, 1], // intersection: {2} → 1
			[0, 2], // intersection: {1} → 1
			[1, 2], // intersection: {0} → 1
			[2, 3], // intersection: {} → 0 (3 not in 2's neighbours, 2 in 3's)
		];

		const result = intersectionBatch(rowOffsets, colIndices, pairs);

		expect(result.intersections).toEqual(new Uint32Array([1, 1, 1, 0]));
		expect(result.sizeUs).toEqual(new Uint32Array([2, 2, 2, 3]));
		expect(result.sizeVs).toEqual(new Uint32Array([2, 3, 3, 1]));
	});

	it("should handle empty pairs array", () => {
		const adj = new Map([[0, [1, 2]]]);
		const { rowOffsets, colIndices } = adjacencyToCSR(adj);

		const result = intersectionBatch(rowOffsets, colIndices, []);

		expect(result.intersections.length).toBe(0);
		expect(result.sizeUs.length).toBe(0);
		expect(result.sizeVs.length).toBe(0);
	});
});

describe("MI variant conversions", () => {
	const createResult = (
		intersection: number,
		sizeU: number,
		sizeV: number,
	): IntersectionResult => ({ intersection, sizeU, sizeV });

	describe("jaccardFromIntersection", () => {
		it("should compute Jaccard = intersection / union", () => {
			// A = {1, 2, 3}, B = {2, 3, 4}
			// intersection = 2, union = 4
			// J = 2/4 = 0.5
			const result = createResult(2, 3, 3);
			expect(jaccardFromIntersection(result)).toBeCloseTo(0.5);
		});

		it("should return 0 for empty intersection", () => {
			const result = createResult(0, 3, 3);
			expect(jaccardFromIntersection(result)).toBe(0);
		});

		it("should return 0 for empty neighbourhoods", () => {
			const result = createResult(0, 0, 0);
			expect(jaccardFromIntersection(result)).toBe(0);
		});

		it("should return 1 for identical neighbourhoods", () => {
			const result = createResult(5, 5, 5);
			expect(jaccardFromIntersection(result)).toBe(1);
		});
	});

	describe("cosineFromIntersection", () => {
		it("should compute Cosine = intersection / sqrt(sizeU * sizeV)", () => {
			// A = {1, 2, 3, 4}, B = {2, 3}
			// intersection = 2, |A| = 4, |B| = 2
			// Cosine = 2 / sqrt(8) = 2 / 2.828 = 0.707
			const result = createResult(2, 4, 2);
			expect(cosineFromIntersection(result)).toBeCloseTo(0.707, 2);
		});

		it("should return 0 for empty neighbourhoods", () => {
			const result = createResult(0, 0, 5);
			expect(cosineFromIntersection(result)).toBe(0);
		});
	});

	describe("sorensenDiceFromIntersection", () => {
		it("should compute SD = 2*intersection / (sizeU + sizeV)", () => {
			// A = {1, 2, 3}, B = {2, 3, 4}
			// intersection = 2, |A| + |B| = 6
			// SD = 2*2 / 6 = 0.667
			const result = createResult(2, 3, 3);
			expect(sorensenDiceFromIntersection(result)).toBeCloseTo(0.667, 2);
		});

		it("should return 0 for empty neighbourhoods", () => {
			const result = createResult(0, 0, 0);
			expect(sorensenDiceFromIntersection(result)).toBe(0);
		});
	});

	describe("overlapFromIntersection", () => {
		it("should compute Overlap = intersection / min(sizeU, sizeV)", () => {
			// A = {1, 2, 3, 4, 5}, B = {2, 3}
			// intersection = 2, min(5, 2) = 2
			// Overlap = 2 / 2 = 1.0
			const result = createResult(2, 5, 2);
			expect(overlapFromIntersection(result)).toBe(1);
		});

		it("should return 0 for empty neighbourhoods", () => {
			const result = createResult(0, 0, 5);
			expect(overlapFromIntersection(result)).toBe(0);
		});
	});
});
