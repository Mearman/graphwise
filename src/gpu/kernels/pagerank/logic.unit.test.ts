import { describe, it, expect } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
import { pagerankNode, pagerankIteration, pagerank } from "./logic";

describe("PageRank logic", () => {
	describe("pagerankNode", () => {
		it("returns uniform contribution for isolated node", () => {
			// Node with no incoming edges
			const rowOffsets = new Uint32Array([0, 0]);
			const colIndices = new Uint32Array([]);
			const ranks = new Float32Array([1.0]);
			const outDegrees = new Uint32Array([0]);
			const damping = 0.85;
			const n = 1;

			// (1 - 0.85) / 1 = 0.15
			const result = pagerankNode(
				rowOffsets,
				colIndices,
				ranks,
				outDegrees,
				0,
				damping,
				n,
			);
			expect(result).toBeCloseTo(0.15);
		});

		it("computes contribution from one incoming edge", () => {
			// Node 1 receives from node 0 (rank 1.0, out-degree 1)
			const rowOffsets = new Uint32Array([0, 0, 1]);
			const colIndices = new Uint32Array([0]);
			const ranks = new Float32Array([1.0, 0.5]);
			const outDegrees = new Uint32Array([1, 0]);
			const damping = 0.85;
			const n = 2;

			// teleport + damping * (1.0 / 1) = 0.075 + 0.85 * 1 = 0.925
			const result = pagerankNode(
				rowOffsets,
				colIndices,
				ranks,
				outDegrees,
				1,
				damping,
				n,
			);
			expect(result).toBeCloseTo(0.075 + 0.85);
		});
	});

	describe("pagerankIteration", () => {
		it("returns uniform distribution with damping=0", () => {
			// 2 nodes, damping 0 means uniform distribution
			const rowOffsets = new Uint32Array([0, 0, 0]);
			const colIndices = new Uint32Array([]);
			const ranks = new Float32Array([1.0, 0.0]);
			const outDegrees = new Uint32Array([0, 0]);
			const damping = 0;
			const n = 2;

			const newRanks = pagerankIteration(
				rowOffsets,
				colIndices,
				ranks,
				outDegrees,
				damping,
				n,
			);

			// (1 - 0) / 2 = 0.5 for both
			expect(newRanks[0]).toBeCloseTo(0.5);
			expect(newRanks[1]).toBeCloseTo(0.5);
		});

		it("preserves sum of ranks", () => {
			// Simple 2-node cycle
			const rowOffsets = new Uint32Array([0, 1, 2]);
			const colIndices = new Uint32Array([1, 0]); // 0 <- 1, 1 <- 0
			const ranks = new Float32Array([0.5, 0.5]);
			const outDegrees = new Uint32Array([1, 1]);
			const damping = 0.85;
			const n = 2;

			const newRanks = pagerankIteration(
				rowOffsets,
				colIndices,
				ranks,
				outDegrees,
				damping,
				n,
			);
			const sum = (newRanks[0] ?? 0) + (newRanks[1] ?? 0);

			expect(sum).toBeCloseTo(1.0, 5);
		});
	});

	describe("pagerank", () => {
		it("handles isolated node with teleport", () => {
			// Single node with no edges: teleport gives (1-d)/n = 0.15
			const rowOffsets = new Uint32Array([0, 0]);
			const colIndices = new Uint32Array([]);
			const outDegrees = new Uint32Array([0]);
			const n = 1;

			const ranks = pagerank(rowOffsets, colIndices, outDegrees, n);

			// With no dangling node redistribution, isolated node gets teleport value
			expect(ranks[0]).toBeCloseTo(0.15, 5);
		});

		it("converges for two-node cycle", () => {
			// A <-> B (both point to each other)
			const rowOffsets = new Uint32Array([0, 1, 2]);
			const colIndices = new Uint32Array([1, 0]);
			const outDegrees = new Uint32Array([1, 1]);
			const n = 2;

			const ranks = pagerank(rowOffsets, colIndices, outDegrees, n);

			// Both should converge to ~0.5
			expect(ranks[0]).toBeCloseTo(0.5, 2);
			expect(ranks[1]).toBeCloseTo(0.5, 2);
			expect((ranks[0] ?? 0) + (ranks[1] ?? 0)).toBeCloseTo(1.0, 5);
		});

		it("gives centre highest rank in star graph", () => {
			// Star: centre (0) connected to leaves (1, 2, 3)
			// Leaves point to centre, centre points to all leaves
			// rowOffsets for transpose: centre receives from leaves
			const rowOffsets = new Uint32Array([0, 3, 3, 3, 3]); // Centre receives 3, leaves receive 0
			const colIndices = new Uint32Array([1, 2, 3]); // Centre receives from leaves
			const outDegrees = new Uint32Array([3, 1, 1, 1]); // Centre has 3 out, leaves have 1
			const n = 4;

			const ranks = pagerank(rowOffsets, colIndices, outDegrees, n);

			// Centre should have highest rank
			expect(ranks[0]).toBeGreaterThan(ranks[1] ?? 0);
			expect(ranks[0]).toBeGreaterThan(ranks[2] ?? 0);
			expect(ranks[0]).toBeGreaterThan(ranks[3] ?? 0);
		});

		it("uses default parameters when not specified", () => {
			const rowOffsets = new Uint32Array([0, 0]);
			const colIndices = new Uint32Array([]);
			const outDegrees = new Uint32Array([0]);
			const n = 1;

			// Should not throw
			const ranks = pagerank(rowOffsets, colIndices, outDegrees, n);
			expect(ranks.length).toBe(1);
		});
	});

	describe("property-based tests", () => {
		fcIt.prop({
			n: fc.integer({ min: 2, max: 10 }),
		})("ranks sum to ~1.0", ({ n }): void => {
			// Create a simple ring graph
			const rowOffsets = new Uint32Array(n + 1);
			const colIndices: number[] = [];
			const outDegrees = new Uint32Array(n).fill(1);

			for (let i = 0; i <= n; i++) {
				rowOffsets[i] = i;
			}
			for (let i = 0; i < n; i++) {
				// Node i receives from (i-1) mod n
				colIndices.push((i - 1 + n) % n);
			}

			const ranks = pagerank(
				rowOffsets,
				new Uint32Array(colIndices),
				outDegrees,
				n,
			);
			const sum = Array.from(ranks).reduce((a, b) => a + b, 0);

			expect(sum).toBeCloseTo(1.0, 3);
		});

		fcIt.prop({
			n: fc.integer({ min: 1, max: 10 }),
		})("all ranks are non-negative", ({ n }): void => {
			// Empty graph
			const rowOffsets = new Uint32Array(n + 1).fill(0);
			const colIndices = new Uint32Array(0);
			const outDegrees = new Uint32Array(n);

			const ranks = pagerank(rowOffsets, colIndices, outDegrees, n);

			for (let i = 0; i < n; i++) {
				expect(ranks[i]).toBeGreaterThanOrEqual(0);
			}
		});
	});
});
