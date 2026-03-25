import { describe, it, expect } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
import { spmvRow, spmv } from "./logic";

describe("SpMV logic", () => {
	describe("spmvRow", () => {
		it("returns 0 for empty row", () => {
			const rowOffsets = new Uint32Array([0, 0]);
			const colIndices = new Uint32Array([]);
			const x = new Float32Array([1, 2, 3]);

			expect(spmvRow(rowOffsets, colIndices, undefined, x, 0)).toBe(0);
		});

		it("computes single entry (unweighted)", () => {
			const rowOffsets = new Uint32Array([0, 1]);
			const colIndices = new Uint32Array([2]);
			const x = new Float32Array([0, 0, 5]);

			expect(spmvRow(rowOffsets, colIndices, undefined, x, 0)).toBe(5);
		});

		it("computes single entry (weighted)", () => {
			const rowOffsets = new Uint32Array([0, 1]);
			const colIndices = new Uint32Array([2]);
			const values = new Float32Array([3]);
			const x = new Float32Array([0, 0, 5]);

			expect(spmvRow(rowOffsets, colIndices, values, x, 0)).toBe(15);
		});

		it("computes multiple entries (unweighted)", () => {
			const rowOffsets = new Uint32Array([0, 3]);
			const colIndices = new Uint32Array([0, 1, 2]);
			const x = new Float32Array([1, 2, 3]);

			// 1*1 + 1*2 + 1*3 = 6
			expect(spmvRow(rowOffsets, colIndices, undefined, x, 0)).toBe(6);
		});

		it("computes multiple entries (weighted)", () => {
			const rowOffsets = new Uint32Array([0, 3]);
			const colIndices = new Uint32Array([0, 1, 2]);
			const values = new Float32Array([2, 3, 4]);
			const x = new Float32Array([1, 2, 3]);

			// 2*1 + 3*2 + 4*3 = 2 + 6 + 12 = 20
			expect(spmvRow(rowOffsets, colIndices, values, x, 0)).toBe(20);
		});
	});

	describe("spmv", () => {
		it("handles empty matrix (0 nodes)", () => {
			const rowOffsets = new Uint32Array([0]);
			const colIndices = new Uint32Array([]);
			const x = new Float32Array([]);

			const y = spmv(rowOffsets, colIndices, undefined, x, 0);
			expect(y.length).toBe(0);
		});

		it("computes identity-like matrix (diagonal)", () => {
			// 2x2 identity matrix
			const rowOffsets = new Uint32Array([0, 1, 2]);
			const colIndices = new Uint32Array([0, 1]);
			const values = new Float32Array([1, 1]);
			const x = new Float32Array([3, 7]);

			const y = spmv(rowOffsets, colIndices, values, x, 2);
			expect(y[0]).toBeCloseTo(3);
			expect(y[1]).toBeCloseTo(7);
		});

		it("handles unweighted matrix (uses 1.0)", () => {
			// 2x2 matrix with all ones
			const rowOffsets = new Uint32Array([0, 2, 4]);
			const colIndices = new Uint32Array([0, 1, 0, 1]);
			const x = new Float32Array([1, 2]);

			const y = spmv(rowOffsets, colIndices, undefined, x, 2);
			// Row 0: 1*1 + 1*2 = 3
			// Row 1: 1*1 + 1*2 = 3
			expect(y[0]).toBeCloseTo(3);
			expect(y[1]).toBeCloseTo(3);
		});

		it("computes weighted SpMV correctly", () => {
			// 2x2 matrix with weights
			const rowOffsets = new Uint32Array([0, 2, 4]);
			const colIndices = new Uint32Array([0, 1, 0, 1]);
			const values = new Float32Array([1, 2, 3, 4]);
			const x = new Float32Array([1, 2]);

			const y = spmv(rowOffsets, colIndices, values, x, 2);
			// Row 0: 1*1 + 2*2 = 5
			// Row 1: 3*1 + 4*2 = 11
			expect(y[0]).toBeCloseTo(5);
			expect(y[1]).toBeCloseTo(11);
		});
	});

	describe("property-based tests", () => {
		fcIt.prop({
			n: fc.integer({ min: 1, max: 10 }),
			x1: fc.array(fc.float({ min: -10, max: 10, noNaN: true }), {
				minLength: 10,
				maxLength: 10,
			}),
			x2: fc.array(fc.float({ min: -10, max: 10, noNaN: true }), {
				minLength: 10,
				maxLength: 10,
			}),
		})("SpMV linearity: A*(x+y) ≈ A*x + A*y", ({ n, x1, x2 }): void => {
			// Simple dense matrix for testing
			const rowOffsets = new Uint32Array(n + 1);
			const colIndices: number[] = [];
			const values: number[] = [];

			for (let i = 0; i <= n; i++) {
				rowOffsets[i] = i * n;
			}
			for (let i = 0; i < n; i++) {
				for (let j = 0; j < n; j++) {
					colIndices.push(j);
					values.push(1);
				}
			}

			const vec1 = new Float32Array(n);
			const vec2 = new Float32Array(n);
			for (let i = 0; i < n; i++) {
				vec1[i] = x1[i] ?? 0;
				vec2[i] = x2[i] ?? 0;
			}

			const sumVec = new Float32Array(n);
			for (let i = 0; i < n; i++) {
				sumVec[i] = (vec1[i] ?? 0) + (vec2[i] ?? 0);
			}

			const y1 = spmv(
				rowOffsets,
				new Uint32Array(colIndices),
				new Float32Array(values),
				vec1,
				n,
			);
			const y2 = spmv(
				rowOffsets,
				new Uint32Array(colIndices),
				new Float32Array(values),
				vec2,
				n,
			);
			const ySum = spmv(
				rowOffsets,
				new Uint32Array(colIndices),
				new Float32Array(values),
				sumVec,
				n,
			);

			for (let i = 0; i < n; i++) {
				expect(ySum[i] ?? 0).toBeCloseTo((y1[i] ?? 0) + (y2[i] ?? 0), 5);
			}
		});

		fcIt.prop({
			n: fc.integer({ min: 1, max: 10 }),
		})("SpMV of zero vector returns zero vector", ({ n }): void => {
			const rowOffsets = new Uint32Array(n + 1);
			const colIndices = new Uint32Array(0);
			const x = new Float32Array(n); // All zeros

			const y = spmv(rowOffsets, colIndices, undefined, x, n);
			for (let i = 0; i < n; i++) {
				expect(y[i]).toBe(0);
			}
		});
	});
});
