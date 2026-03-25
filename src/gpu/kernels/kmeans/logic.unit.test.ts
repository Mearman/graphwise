/**
 * Unit tests for K-means CPU reference implementation.
 */

import { describe, it, expect } from "vitest";
import {
	squaredEuclideanDistance,
	euclideanDistance,
	assignPointsToCentroids,
	updateCentroids,
	initializeCentroidsKMeansPlusPlus,
	kmeans,
} from "./logic";

describe("K-means logic", () => {
	describe("squaredEuclideanDistance", () => {
		it("computes distance for identical points", () => {
			expect(squaredEuclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0);
		});

		it("computes distance for different points", () => {
			expect(squaredEuclideanDistance([0, 0], [3, 4])).toBe(25); // 3² + 4² = 25
		});

		it("handles single dimension", () => {
			expect(squaredEuclideanDistance([0], [5])).toBe(25);
		});
	});

	describe("euclideanDistance", () => {
		it("computes distance for identical points", () => {
			expect(euclideanDistance([1, 2, 3], [1, 2, 3])).toBe(0);
		});

		it("computes distance for different points", () => {
			expect(euclideanDistance([0, 0], [3, 4])).toBe(5);
		});

		it("is sqrt of squared distance", () => {
			const a = [1, 2, 3];
			const b = [4, 5, 6];
			expect(euclideanDistance(a, b)).toBeCloseTo(
				Math.sqrt(squaredEuclideanDistance(a, b)),
			);
		});
	});

	describe("assignPointsToCentroids", () => {
		it("assigns points to nearest centroid", () => {
			const points = [
				[0, 0],
				[10, 10],
				[1, 1],
				[9, 9],
			];
			const centroids = [
				[0, 0],
				[10, 10],
			];

			const result = assignPointsToCentroids(points, centroids);

			expect(result.assignments).toEqual(new Uint32Array([0, 1, 0, 1]));
			expect(result.distances[0]).toBeCloseTo(0);
			expect(result.distances[1]).toBeCloseTo(0);
		});

		it("handles empty points array", () => {
			const result = assignPointsToCentroids([], [[0, 0]]);
			expect(result.assignments.length).toBe(0);
			expect(result.distances.length).toBe(0);
		});

		it("handles single centroid", () => {
			const points = [
				[0, 0],
				[10, 10],
			];
			const centroids = [[5, 5]];

			const result = assignPointsToCentroids(points, centroids);

			expect(result.assignments).toEqual(new Uint32Array([0, 0]));
		});

		it("computes correct distances", () => {
			const points = [[0, 0]];
			const centroids = [[3, 4]];

			const result = assignPointsToCentroids(points, centroids);

			expect(result.distances[0]).toBeCloseTo(5); // sqrt(3² + 4²)
		});
	});

	describe("updateCentroids", () => {
		it("computes mean of assigned points", () => {
			const points = [
				[0, 0],
				[2, 2],
				[10, 10],
				[12, 12],
			];
			const assignments = new Uint32Array([0, 0, 1, 1]);

			const centroids = updateCentroids(points, assignments, 2, 2);

			expect(centroids[0]).toEqual([1, 1]); // Mean of [0,0] and [2,2]
			expect(centroids[1]).toEqual([11, 11]); // Mean of [10,10] and [12,12]
		});

		it("handles empty cluster", () => {
			const points = [[1, 1]];
			const assignments = new Uint32Array([1]); // No points assigned to cluster 0

			const centroids = updateCentroids(points, assignments, 2, 2);

			expect(centroids[0]).toEqual([0, 0]); // Empty cluster stays at origin
			expect(centroids[1]).toEqual([1, 1]);
		});

		it("handles empty points array", () => {
			const centroids = updateCentroids([], new Uint32Array(0), 2, 2);

			expect(centroids[0]).toEqual([0, 0]);
			expect(centroids[1]).toEqual([0, 0]);
		});
	});

	describe("initializeCentroidsKMeansPlusPlus", () => {
		it("selects k centroids", () => {
			const points = [
				[0, 0],
				[1, 1],
				[10, 10],
				[11, 11],
			];
			const rng = () => 0.5;

			const centroids = initializeCentroidsKMeansPlusPlus(points, 2, rng);

			expect(centroids.length).toBe(2);
		});

		it("handles empty points array", () => {
			const centroids = initializeCentroidsKMeansPlusPlus([], 3, Math.random);
			expect(centroids.length).toBe(0);
		});

		it("handles k larger than points", () => {
			const points = [[0, 0]];
			const centroids = initializeCentroidsKMeansPlusPlus(
				points,
				3,
				Math.random,
			);
			expect(centroids.length).toBe(1);
		});

		it("selects spread out centroids", () => {
			// Two well-separated clusters
			const points: number[][] = [];
			for (let i = 0; i < 10; i++) {
				points.push([i * 0.1, i * 0.1]); // Cluster 1: near origin
			}
			for (let i = 0; i < 10; i++) {
				points.push([100 + i * 0.1, 100 + i * 0.1]); // Cluster 2: far from origin
			}

			// With deterministic RNG, first centroid at index 10 (100, 100)
			// Second centroid should be from cluster 1 (max distance from first)
			const rng = () => 0.5;
			const centroids = initializeCentroidsKMeansPlusPlus(points, 2, rng);

			expect(centroids.length).toBe(2);
			// Verify centroids are from different clusters
			const dist = euclideanDistance(
				centroids[0] ?? [0, 0],
				centroids[1] ?? [0, 0],
			);
			expect(dist).toBeGreaterThan(50); // Should be well-separated
		});
	});

	describe("kmeans", () => {
		it("clusters simple 2D points", () => {
			const points: number[][] = [];
			// Cluster 1: around (0, 0)
			for (let i = 0; i < 5; i++) {
				points.push([Math.random(), Math.random()]);
			}
			// Cluster 2: around (10, 10)
			for (let i = 0; i < 5; i++) {
				points.push([10 + Math.random(), 10 + Math.random()]);
			}

			const result = kmeans(points, 2, { rng: () => 0.5 });

			expect(result.assignments.length).toBe(10);
			expect(result.centroids.length).toBe(2);
			// Check that centroids are near the cluster centers
			const centroid0 = result.centroids[0] ?? [0, 0];
			const centroid1 = result.centroids[1] ?? [0, 0];
			// One centroid should be near origin, other near (10,10)
			const nearOrigin =
				Math.sqrt(centroid0[0]! ** 2 + centroid0[1]! ** 2) < 5 ||
				Math.sqrt(centroid1[0]! ** 2 + centroid1[1]! ** 2) < 5;
			expect(nearOrigin).toBe(true);
		});

		it("handles empty points array", () => {
			const result = kmeans([], 3);

			expect(result.assignments.length).toBe(0);
			expect(result.centroids.length).toBe(0);
			expect(result.converged).toBe(true);
		});

		it("handles k=1", () => {
			const points = [
				[0, 0],
				[2, 2],
			];
			const result = kmeans(points, 1);

			expect(result.assignments).toEqual(new Uint32Array([0, 0]));
			expect(result.centroids[0]).toEqual([1, 1]);
		});

		it("converges on identical points", () => {
			const points = [
				[5, 5],
				[5, 5],
				[5, 5],
			];
			const result = kmeans(points, 2);

			expect(result.converged).toBe(true);
		});

		it("uses provided initial centroids", () => {
			const points = [
				[0, 0],
				[10, 10],
			];
			const initialCentroids = [
				[0, 0],
				[10, 10],
			];

			const result = kmeans(points, 2, { initialCentroids });

			// With perfect initial centroids, should converge immediately
			expect(result.converged).toBe(true);
		});

		it("respects maxIterations", () => {
			const points = [
				[0, 0],
				[10, 10],
			];

			const result = kmeans(points, 2, { maxIterations: 1 });

			expect(result.iterations).toBe(1);
		});
	});
});
