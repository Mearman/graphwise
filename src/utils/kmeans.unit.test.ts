import { describe, it, expect } from "vitest";
import {
	miniBatchKMeans,
	normaliseFeatures,
	_computeMean,
	type LabelledFeature,
} from "./kmeans";

describe("kmeans utilities", () => {
	describe("_computeMean", () => {
		it("returns zero vector for empty array", () => {
			const result = _computeMean([]);
			expect(result).toEqual({ f1: 0, f2: 0, f3: 0 });
		});

		it("computes mean of single vector", () => {
			const result = _computeMean([{ f1: 1, f2: 2, f3: 3 }]);
			expect(result).toEqual({ f1: 1, f2: 2, f3: 3 });
		});

		it("computes mean of multiple vectors", () => {
			const result = _computeMean([
				{ f1: 1, f2: 2, f3: 3 },
				{ f1: 3, f2: 4, f3: 5 },
			]);
			expect(result).toEqual({ f1: 2, f2: 3, f3: 4 });
		});
	});

	describe("normaliseFeatures", () => {
		it("returns empty array for empty input", () => {
			expect(normaliseFeatures([])).toEqual([]);
		});

		it("preserves nodeId", () => {
			const features: LabelledFeature[] = [
				{ nodeId: "A", f1: 1, f2: 2, f3: 3 },
			];
			const result = normaliseFeatures(features);
			expect(result[0]?.nodeId).toBe("A");
		});

		it("normalises to zero mean", () => {
			const features: LabelledFeature[] = [
				{ nodeId: "A", f1: 1, f2: 1, f3: 1 },
				{ nodeId: "B", f1: 3, f2: 3, f3: 3 },
			];
			const result = normaliseFeatures(features);

			// Mean of f1, f2, f3 should be 0 after normalisation
			const meanF1 = result.reduce((s, f) => s + f.f1, 0) / result.length;
			expect(Math.abs(meanF1)).toBeLessThan(0.001);
		});
	});

	describe("miniBatchKMeans", () => {
		it("returns empty result for empty input", () => {
			const result = miniBatchKMeans([], { k: 3 });
			expect(result.centroids).toHaveLength(0);
			expect(result.assignments.size).toBe(0);
		});

		it("creates requested clusters", () => {
			const features: LabelledFeature[] = [
				{ nodeId: "A", f1: 0, f2: 0, f3: 0 },
				{ nodeId: "B", f1: 10, f2: 10, f3: 10 },
				{ nodeId: "C", f1: 0, f2: 0, f3: 0 },
				{ nodeId: "D", f1: 10, f2: 10, f3: 10 },
			];

			const result = miniBatchKMeans(features, { k: 2 });

			expect(result.centroids).toHaveLength(2);
			expect(result.k).toBe(2);
		});

		it("assigns all points to clusters", () => {
			const features: LabelledFeature[] = [
				{ nodeId: "A", f1: 0, f2: 0, f3: 0 },
				{ nodeId: "B", f1: 1, f2: 1, f3: 1 },
				{ nodeId: "C", f1: 2, f2: 2, f3: 2 },
			];

			const result = miniBatchKMeans(features, { k: 2 });

			expect(result.assignments.size).toBe(3);
			expect(result.assignments.has("A")).toBe(true);
			expect(result.assignments.has("B")).toBe(true);
			expect(result.assignments.has("C")).toBe(true);
		});

		it("limits k to number of points", () => {
			const features: LabelledFeature[] = [
				{ nodeId: "A", f1: 0, f2: 0, f3: 0 },
			];

			const result = miniBatchKMeans(features, { k: 10 });

			expect(result.k).toBe(1);
			expect(result.centroids).toHaveLength(1);
		});

		it("is reproducible with same seed", () => {
			const features: LabelledFeature[] = [
				{ nodeId: "A", f1: 0, f2: 0, f3: 0 },
				{ nodeId: "B", f1: 10, f2: 10, f3: 10 },
				{ nodeId: "C", f1: 0, f2: 0, f3: 0 },
				{ nodeId: "D", f1: 10, f2: 10, f3: 10 },
			];

			const result1 = miniBatchKMeans(features, { k: 2, seed: 42 });
			const result2 = miniBatchKMeans(features, { k: 2, seed: 42 });

			expect(result1.assignments.get("A")).toBe(result2.assignments.get("A"));
			expect(result1.assignments.get("B")).toBe(result2.assignments.get("B"));
		});

		it("respects maxIterations", () => {
			const features: LabelledFeature[] = [
				{ nodeId: "A", f1: 0, f2: 0, f3: 0 },
				{ nodeId: "B", f1: 10, f2: 10, f3: 10 },
			];

			// Should complete without error even with low iteration limit
			const result = miniBatchKMeans(features, {
				k: 2,
				maxIterations: 1,
			});

			expect(result.centroids).toHaveLength(2);
		});

		it("groups similar points together", () => {
			const features: LabelledFeature[] = [
				{ nodeId: "A", f1: 0, f2: 0, f3: 0 },
				{ nodeId: "B", f1: 0.1, f2: 0.1, f3: 0.1 },
				{ nodeId: "C", f1: 10, f2: 10, f3: 10 },
				{ nodeId: "D", f1: 10.1, f2: 10.1, f3: 10.1 },
			];

			const result = miniBatchKMeans(features, { k: 2, seed: 42 });

			// A and B should be in same cluster, C and D in same cluster
			const clusterA = result.assignments.get("A");
			const clusterB = result.assignments.get("B");
			const clusterC = result.assignments.get("C");
			const clusterD = result.assignments.get("D");

			expect(clusterA).toBe(clusterB);
			expect(clusterC).toBe(clusterD);
			expect(clusterA).not.toBe(clusterC);
		});
	});
});
