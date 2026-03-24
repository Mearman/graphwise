import { describe, it, expect } from "vitest";
import {
	shannonEntropy,
	normalisedEntropy,
	entropyFromCounts,
	localTypeEntropy,
} from "./entropy";

describe("entropy utilities", () => {
	describe("shannonEntropy", () => {
		it("returns 0 for empty array", () => {
			expect(shannonEntropy([])).toBe(0);
		});

		it("returns 0 for deterministic distribution", () => {
			expect(shannonEntropy([1])).toBe(0);
			expect(shannonEntropy([1, 0, 0])).toBe(0);
		});

		it("returns correct entropy for uniform distribution", () => {
			// Uniform distribution over n values has entropy log2(n)
			expect(shannonEntropy([0.5, 0.5])).toBeCloseTo(1, 5);
			expect(shannonEntropy([0.25, 0.25, 0.25, 0.25])).toBeCloseTo(2, 5);
		});

		it("handles non-uniform distributions", () => {
			// 75/25 split
			const entropy = shannonEntropy([0.75, 0.25]);
			expect(entropy).toBeGreaterThan(0);
			expect(entropy).toBeLessThan(1);
		});

		it("ignores zero probabilities", () => {
			const e1 = shannonEntropy([0.5, 0.5]);
			const e2 = shannonEntropy([0.5, 0.5, 0]);
			expect(e1).toBeCloseTo(e2, 5);
		});
	});

	describe("normalisedEntropy", () => {
		it("returns 0 for empty array", () => {
			expect(normalisedEntropy([])).toBe(0);
		});

		it("returns 0 for single element", () => {
			expect(normalisedEntropy([1])).toBe(0);
		});

		it("returns 1 for uniform distribution", () => {
			expect(normalisedEntropy([0.5, 0.5])).toBeCloseTo(1, 5);
			expect(normalisedEntropy([0.25, 0.25, 0.25, 0.25])).toBeCloseTo(1, 5);
		});

		it("returns values between 0 and 1 for mixed distributions", () => {
			const norm = normalisedEntropy([0.75, 0.25]);
			expect(norm).toBeGreaterThan(0);
			expect(norm).toBeLessThan(1);
		});
	});

	describe("entropyFromCounts", () => {
		it("returns 0 for empty array", () => {
			expect(entropyFromCounts([])).toBe(0);
		});

		it("returns 0 for single count", () => {
			expect(entropyFromCounts([10])).toBe(0);
		});

		it("computes entropy from counts", () => {
			// [5, 5] should be uniform (entropy = 1 bit)
			const entropy = entropyFromCounts([5, 5]);
			expect(entropy).toBeCloseTo(1, 5);
		});
	});

	describe("localTypeEntropy", () => {
		it("returns 0 for empty array", () => {
			expect(localTypeEntropy([])).toBe(0);
		});

		it("returns 0 for single type", () => {
			expect(localTypeEntropy(["A"])).toBe(0);
		});

		it("returns 0 for all same types", () => {
			expect(localTypeEntropy(["A", "A", "A"])).toBe(0);
		});

		it("computes entropy for mixed types", () => {
			const entropy = localTypeEntropy(["A", "B"]);
			expect(entropy).toBeGreaterThan(0);
		});
	});
});
