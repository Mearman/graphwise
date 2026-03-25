import { describe, it, expect } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
import { computeDegree, buildDegreeStats } from "./logic";

describe("Degree histogram logic", () => {
	describe("computeDegree", () => {
		it("returns 0 for isolated node", () => {
			const rowOffsets = new Uint32Array([0, 0]);
			expect(computeDegree(rowOffsets, 0)).toBe(0);
		});

		it("returns correct degree for connected node", () => {
			const rowOffsets = new Uint32Array([0, 3]);
			expect(computeDegree(rowOffsets, 0)).toBe(3);
		});

		it("handles multiple nodes correctly", () => {
			const rowOffsets = new Uint32Array([0, 2, 5, 5]);
			expect(computeDegree(rowOffsets, 0)).toBe(2);
			expect(computeDegree(rowOffsets, 1)).toBe(3);
			expect(computeDegree(rowOffsets, 2)).toBe(0);
		});
	});

	describe("buildDegreeStats", () => {
		it("handles empty graph (0 nodes)", () => {
			const rowOffsets = new Uint32Array([0]);
			const stats = buildDegreeStats(rowOffsets, 0);

			expect(stats.degrees.length).toBe(0);
			expect(stats.maxDegree).toBe(0);
			expect(stats.totalDegree).toBe(0);
			expect(stats.meanDegree).toBe(0);
		});

		it("handles single isolated node", () => {
			const rowOffsets = new Uint32Array([0, 0]);
			const stats = buildDegreeStats(rowOffsets, 1);

			expect(stats.degrees.length).toBe(1);
			expect(stats.degrees[0]).toBe(0);
			expect(stats.maxDegree).toBe(0);
			expect(stats.totalDegree).toBe(0);
			expect(stats.histogram[0]).toBe(1);
		});

		it("computes chain graph A-B-C correctly", () => {
			// A-B-C: degrees are [1, 2, 1] (A has 1 neighbour, B has 2, C has 1)
			const rowOffsets = new Uint32Array([0, 1, 3, 4]);
			const stats = buildDegreeStats(rowOffsets, 3);

			expect(stats.degrees[0]).toBe(1);
			expect(stats.degrees[1]).toBe(2);
			expect(stats.degrees[2]).toBe(1);
			expect(stats.maxDegree).toBe(2);
			expect(stats.totalDegree).toBe(4);
			expect(stats.meanDegree).toBeCloseTo(4 / 3);
			expect(stats.histogram[1]).toBe(2); // Two nodes with degree 1
			expect(stats.histogram[2]).toBe(1); // One node with degree 2
		});

		it("computes star graph correctly", () => {
			// Star: centre (0) connected to 4 leaves
			// Centre degree = 4, leaves degree = 1
			const rowOffsets = new Uint32Array([0, 4, 5, 6, 7, 8]);
			const stats = buildDegreeStats(rowOffsets, 5);

			expect(stats.degrees[0]).toBe(4);
			expect(stats.degrees[1]).toBe(1);
			expect(stats.degrees[2]).toBe(1);
			expect(stats.maxDegree).toBe(4);
			expect(stats.histogram[1]).toBe(4);
			expect(stats.histogram[4]).toBe(1);
		});

		it("histogram values sum to nodeCount", () => {
			const rowOffsets = new Uint32Array([0, 2, 5, 7, 10]);
			const stats = buildDegreeStats(rowOffsets, 4);

			const histSum = Array.from(stats.histogram).reduce((a, b) => a + b, 0);
			expect(histSum).toBe(4);
		});

		it("totalDegree equals sum of all degrees", () => {
			const rowOffsets = new Uint32Array([0, 3, 7, 10]);
			const stats = buildDegreeStats(rowOffsets, 3);

			const degSum = Array.from(stats.degrees).reduce((a, b) => a + b, 0);
			expect(stats.totalDegree).toBe(degSum);
		});

		it("meanDegree = totalDegree / nodeCount", () => {
			const rowOffsets = new Uint32Array([0, 2, 5, 9]);
			const stats = buildDegreeStats(rowOffsets, 3);

			expect(stats.meanDegree).toBeCloseTo(stats.totalDegree / 3);
		});

		it("respects custom histogramSize", () => {
			const rowOffsets = new Uint32Array([0, 1, 2]);
			const stats = buildDegreeStats(rowOffsets, 2, 10);

			expect(stats.histogram.length).toBe(10);
		});
	});

	describe("property-based tests", () => {
		fcIt.prop({
			degrees: fc.array(fc.integer({ min: 0, max: 10 }), {
				minLength: 1,
				maxLength: 20,
			}),
		})("histogram sums to nodeCount", ({ degrees }): void => {
			// Build rowOffsets from degrees
			const n = degrees.length;
			const rowOffsets = new Uint32Array(n + 1);
			let offset = 0;
			for (let i = 0; i < n; i++) {
				rowOffsets[i] = offset;
				offset += degrees[i] ?? 0;
			}
			rowOffsets[n] = offset;

			const stats = buildDegreeStats(rowOffsets, n);
			const histSum = Array.from(stats.histogram).reduce((a, b) => a + b, 0);

			expect(histSum).toBe(n);
		});

		fcIt.prop({
			degrees: fc.array(fc.integer({ min: 0, max: 10 }), {
				minLength: 1,
				maxLength: 20,
			}),
		})("all degrees are non-negative", ({ degrees }): void => {
			const n = degrees.length;
			const rowOffsets = new Uint32Array(n + 1);
			let offset = 0;
			for (let i = 0; i < n; i++) {
				rowOffsets[i] = offset;
				offset += degrees[i] ?? 0;
			}
			rowOffsets[n] = offset;

			const stats = buildDegreeStats(rowOffsets, n);

			for (let i = 0; i < n; i++) {
				expect(stats.degrees[i]).toBeGreaterThanOrEqual(0);
			}
		});

		fcIt.prop({
			degrees: fc.array(fc.integer({ min: 0, max: 10 }), {
				minLength: 1,
				maxLength: 20,
			}),
		})("maxDegree matches maximum entry", ({ degrees }): void => {
			const n = degrees.length;
			const rowOffsets = new Uint32Array(n + 1);
			let offset = 0;
			for (let i = 0; i < n; i++) {
				rowOffsets[i] = offset;
				offset += degrees[i] ?? 0;
			}
			rowOffsets[n] = offset;

			const stats = buildDegreeStats(rowOffsets, n);
			const expectedMax = Math.max(...degrees, 0);

			expect(stats.maxDegree).toBe(expectedMax);
		});
	});
});
