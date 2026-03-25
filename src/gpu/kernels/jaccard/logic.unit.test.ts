import { describe, it, expect } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
import { binarySearch, jaccardPair, jaccardBatch } from "./logic";

describe("Jaccard logic", () => {
	describe("binarySearch", () => {
		it("finds element at start", () => {
			const arr = new Uint32Array([1, 2, 3, 4, 5]);
			expect(binarySearch(arr, 0, 5, 1)).toBe(true);
		});

		it("finds element at end", () => {
			const arr = new Uint32Array([1, 2, 3, 4, 5]);
			expect(binarySearch(arr, 0, 5, 5)).toBe(true);
		});

		it("finds element in middle", () => {
			const arr = new Uint32Array([1, 2, 3, 4, 5]);
			expect(binarySearch(arr, 0, 5, 3)).toBe(true);
		});

		it("returns false for missing element", () => {
			const arr = new Uint32Array([1, 2, 4, 5]);
			expect(binarySearch(arr, 0, 4, 3)).toBe(false);
		});

		it("handles empty range", () => {
			const arr = new Uint32Array([1, 2, 3]);
			expect(binarySearch(arr, 1, 1, 2)).toBe(false);
		});

		it("handles single element (found)", () => {
			const arr = new Uint32Array([5]);
			expect(binarySearch(arr, 0, 1, 5)).toBe(true);
		});

		it("handles single element (not found)", () => {
			const arr = new Uint32Array([5]);
			expect(binarySearch(arr, 0, 1, 3)).toBe(false);
		});

		it("searches within subarray", () => {
			const arr = new Uint32Array([1, 2, 3, 4, 5]);
			expect(binarySearch(arr, 1, 4, 2)).toBe(true); // 2 is at index 1
			expect(binarySearch(arr, 1, 4, 4)).toBe(true); // 4 is at index 3, within [1,4)
			expect(binarySearch(arr, 1, 4, 5)).toBe(false); // 5 is at index 4, excluded
		});
	});

	describe("jaccardPair", () => {
		it("returns 1.0 for identical neighbourhoods", () => {
			// Nodes 0 and 1 both have neighbours [2, 3]
			const rowOffsets = new Uint32Array([0, 2, 4, 4, 4]);
			const colIndices = new Uint32Array([2, 3, 2, 3]);

			expect(jaccardPair(rowOffsets, colIndices, 0, 1)).toBeCloseTo(1.0);
		});

		it("returns 0.0 for disjoint neighbourhoods", () => {
			// Node 0 has neighbour [2], node 1 has neighbour [3]
			const rowOffsets = new Uint32Array([0, 1, 2, 2, 2]);
			const colIndices = new Uint32Array([2, 3]);

			expect(jaccardPair(rowOffsets, colIndices, 0, 1)).toBeCloseTo(0.0);
		});

		it("returns 0.5 for half overlap", () => {
			// Node 0 has neighbours [2, 3], node 1 has neighbours [3, 4]
			// Intersection: [3] = 1, Union: [2, 3, 4] = 3
			// Jaccard = 1/3 ≈ 0.333
			const rowOffsets = new Uint32Array([0, 2, 4, 4, 4, 4]);
			const colIndices = new Uint32Array([2, 3, 3, 4]);

			expect(jaccardPair(rowOffsets, colIndices, 0, 1)).toBeCloseTo(1 / 3);
		});

		it("returns 0.0 when one node has degree 0", () => {
			// Node 0 has no neighbours, node 1 has neighbour [2]
			const rowOffsets = new Uint32Array([0, 0, 1, 1]);
			const colIndices = new Uint32Array([2]);

			expect(jaccardPair(rowOffsets, colIndices, 0, 1)).toBeCloseTo(0.0);
		});

		it("returns 0.0 when both nodes have degree 0", () => {
			const rowOffsets = new Uint32Array([0, 0, 0]);
			const colIndices = new Uint32Array([]);

			expect(jaccardPair(rowOffsets, colIndices, 0, 1)).toBeCloseTo(0.0);
		});

		it("returns 1.0 for self-similarity (same node)", () => {
			// Node 0 has neighbours [1, 2]
			const rowOffsets = new Uint32Array([0, 2, 2, 2]);
			const colIndices = new Uint32Array([1, 2]);

			expect(jaccardPair(rowOffsets, colIndices, 0, 0)).toBeCloseTo(1.0);
		});
	});

	describe("jaccardBatch", () => {
		it("computes multiple pairs correctly", () => {
			const rowOffsets = new Uint32Array([0, 2, 4, 4, 4]);
			const colIndices = new Uint32Array([2, 3, 2, 3]);
			const pairs: readonly (readonly [number, number])[] = [
				[0, 1], // Identical → 1.0
				[0, 0], // Self → 1.0
			] as const;

			const results = jaccardBatch(rowOffsets, colIndices, pairs);

			expect(results.length).toBe(2);
			expect(results[0]).toBeCloseTo(1.0);
			expect(results[1]).toBeCloseTo(1.0);
		});

		it("returns empty array for empty pairs", () => {
			const rowOffsets = new Uint32Array([0]);
			const colIndices = new Uint32Array([]);
			const pairs: readonly (readonly [number, number])[] = [];

			const results = jaccardBatch(rowOffsets, colIndices, pairs);

			expect(results.length).toBe(0);
		});

		it("handles single pair", () => {
			const rowOffsets = new Uint32Array([0, 1, 2, 2]);
			const colIndices = new Uint32Array([1, 0]);
			const pairs: readonly (readonly [number, number])[] = [[0, 1]] as const;

			const results = jaccardBatch(rowOffsets, colIndices, pairs);

			expect(results.length).toBe(1);
			expect(results[0]).toBeGreaterThanOrEqual(0);
			expect(results[0]).toBeLessThanOrEqual(1);
		});
	});

	describe("property-based tests", () => {
		fcIt.prop({
			neighbours0: fc.uniqueArray(fc.integer({ min: 0, max: 20 }), {
				minLength: 0,
				maxLength: 10,
			}),
			neighbours1: fc.uniqueArray(fc.integer({ min: 0, max: 20 }), {
				minLength: 0,
				maxLength: 10,
			}),
		})("Jaccard always in [0, 1]", ({ neighbours0, neighbours1 }): void => {
			// Build CSR with 2 nodes (0 and 1) plus potential neighbours
			const sorted0 = [...neighbours0].sort((a, b) => a - b);
			const sorted1 = [...neighbours1].sort((a, b) => a - b);

			const rowOffsets = new Uint32Array([
				0,
				sorted0.length,
				sorted0.length + sorted1.length,
			]);
			const colIndices = new Uint32Array([...sorted0, ...sorted1]);

			const j = jaccardPair(rowOffsets, colIndices, 0, 1);

			expect(j).toBeGreaterThanOrEqual(0);
			expect(j).toBeLessThanOrEqual(1);
		});

		fcIt.prop({
			neighbours0: fc.uniqueArray(fc.integer({ min: 0, max: 20 }), {
				minLength: 1,
				maxLength: 10,
			}),
			neighbours1: fc.uniqueArray(fc.integer({ min: 0, max: 20 }), {
				minLength: 1,
				maxLength: 10,
			}),
		})(
			"Jaccard is symmetric: J(u,v) = J(v,u)",
			({ neighbours0, neighbours1 }): void => {
				const sorted0 = [...neighbours0].sort((a, b) => a - b);
				const sorted1 = [...neighbours1].sort((a, b) => a - b);

				const rowOffsets = new Uint32Array([
					0,
					sorted0.length,
					sorted0.length + sorted1.length,
				]);
				const colIndices = new Uint32Array([...sorted0, ...sorted1]);

				const j01 = jaccardPair(rowOffsets, colIndices, 0, 1);
				const j10 = jaccardPair(rowOffsets, colIndices, 1, 0);

				expect(j01).toBeCloseTo(j10, 10);
			},
		);
	});
});
