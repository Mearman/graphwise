import { describe, it, expect } from "vitest";
import { fc, it as fcIt } from "@fast-check/vitest";
import { bfsLevel, bfs } from "./logic";

describe("BFS logic", () => {
	describe("bfsLevel", () => {
		it("expands single frontier node to neighbours", () => {
			// Node 0 has neighbours [1, 2]
			const rowOffsets = new Uint32Array([0, 2, 2, 2]);
			const colIndices = new Uint32Array([1, 2]);
			const visited = new Uint8Array(3);
			const levels = new Int32Array(3).fill(-1);

			visited[0] = 1;
			levels[0] = 0;

			const nextFrontier = bfsLevel(
				rowOffsets,
				colIndices,
				[0],
				visited,
				levels,
				0,
			);

			expect(nextFrontier).toContain(1);
			expect(nextFrontier).toContain(2);
			expect(nextFrontier.length).toBe(2);
			expect(levels[1]).toBe(1);
			expect(levels[2]).toBe(1);
		});

		it("skips already-visited neighbours", () => {
			const rowOffsets = new Uint32Array([0, 2, 2, 2]);
			const colIndices = new Uint32Array([1, 2]);
			const visited = new Uint8Array(3);
			const levels = new Int32Array(3).fill(-1);

			visited[0] = 1;
			visited[1] = 1; // Already visited
			levels[0] = 0;
			levels[1] = 0;

			const nextFrontier = bfsLevel(
				rowOffsets,
				colIndices,
				[0],
				visited,
				levels,
				0,
			);

			expect(nextFrontier).not.toContain(1);
			expect(nextFrontier).toContain(2);
			expect(nextFrontier.length).toBe(1);
		});

		it("returns empty array for empty frontier", () => {
			const rowOffsets = new Uint32Array([0]);
			const colIndices = new Uint32Array([]);
			const visited = new Uint8Array(0);
			const levels = new Int32Array(0);

			const nextFrontier = bfsLevel(
				rowOffsets,
				colIndices,
				[],
				visited,
				levels,
				0,
			);

			expect(nextFrontier.length).toBe(0);
		});

		it("returns empty array for isolated node", () => {
			const rowOffsets = new Uint32Array([0, 0]);
			const colIndices = new Uint32Array([]);
			const visited = new Uint8Array(1);
			const levels = new Int32Array(1).fill(-1);

			visited[0] = 1;
			levels[0] = 0;

			const nextFrontier = bfsLevel(
				rowOffsets,
				colIndices,
				[0],
				visited,
				levels,
				0,
			);

			expect(nextFrontier.length).toBe(0);
		});
	});

	describe("bfs", () => {
		it("handles single node", () => {
			const rowOffsets = new Uint32Array([0, 0]);
			const colIndices = new Uint32Array([]);

			const result = bfs(rowOffsets, colIndices, 1, 0);

			expect(result.levels[0]).toBe(0);
			expect(result.depth).toBe(1);
			expect(result.nodesReached).toBe(1);
		});

		it("computes linear chain A-B-C-D", () => {
			// Chain: 0-1-2-3 (undirected)
			// Node 0: [1], Node 1: [0, 2], Node 2: [1, 3], Node 3: [2]
			const rowOffsets = new Uint32Array([0, 1, 3, 5, 6]);
			const colIndices = new Uint32Array([1, 0, 2, 1, 3, 2]);

			const result = bfs(rowOffsets, colIndices, 4, 0);

			expect(result.levels[0]).toBe(0);
			expect(result.levels[1]).toBe(1);
			expect(result.levels[2]).toBe(2);
			expect(result.levels[3]).toBe(3);
			expect(result.depth).toBe(4);
			expect(result.nodesReached).toBe(4);
		});

		it("handles disconnected graph", () => {
			// Two components: 0-1 and 2-3
			const rowOffsets = new Uint32Array([0, 1, 2, 3, 4]);
			const colIndices = new Uint32Array([1, 0, 3, 2]);

			const result = bfs(rowOffsets, colIndices, 4, 0);

			expect(result.levels[0]).toBe(0);
			expect(result.levels[1]).toBe(1);
			expect(result.levels[2]).toBe(-1); // Unreachable
			expect(result.levels[3]).toBe(-1); // Unreachable
			expect(result.nodesReached).toBe(2);
		});

		it("handles cycle graph", () => {
			// Cycle: 0-1-2-3-0
			const rowOffsets = new Uint32Array([0, 2, 4, 6, 8]);
			const colIndices = new Uint32Array([1, 3, 0, 2, 1, 3, 0, 2]);

			const result = bfs(rowOffsets, colIndices, 4, 0);

			// All reachable from any source
			expect(result.nodesReached).toBe(4);
			for (let i = 0; i < 4; i++) {
				expect(result.levels[i]).toBeGreaterThanOrEqual(0);
			}
		});

		it("handles star graph (centre at source)", () => {
			// Star: centre (0) connected to leaves (1, 2, 3, 4)
			const rowOffsets = new Uint32Array([0, 4, 5, 6, 7, 8]);
			const colIndices = new Uint32Array([1, 2, 3, 4, 0, 0, 0, 0]);

			const result = bfs(rowOffsets, colIndices, 5, 0);

			expect(result.levels[0]).toBe(0);
			expect(result.levels[1]).toBe(1);
			expect(result.levels[2]).toBe(1);
			expect(result.levels[3]).toBe(1);
			expect(result.levels[4]).toBe(1);
			expect(result.depth).toBe(2);
		});

		it("handles empty graph", () => {
			const rowOffsets = new Uint32Array([0]);
			const colIndices = new Uint32Array([]);

			const result = bfs(rowOffsets, colIndices, 0, 0);

			expect(result.levels.length).toBe(0);
			expect(result.depth).toBe(0);
			expect(result.nodesReached).toBe(0);
		});

		it("nodesReached matches count of non-(-1) levels", () => {
			// Disconnected: 0-1 and 2-3
			const rowOffsets = new Uint32Array([0, 1, 2, 3, 4]);
			const colIndices = new Uint32Array([1, 0, 3, 2]);

			const result = bfs(rowOffsets, colIndices, 4, 0);

			const reachableCount = Array.from(result.levels).filter(
				(l) => l >= 0,
			).length;
			expect(result.nodesReached).toBe(reachableCount);
		});
	});

	describe("property-based tests", () => {
		fcIt.prop({
			edges: fc.array(
				fc.tuple(
					fc.integer({ min: 0, max: 4 }),
					fc.integer({ min: 0, max: 4 }),
				),
				{ maxLength: 10 },
			),
			source: fc.integer({ min: 0, max: 4 }),
		})(
			"levels are monotonically non-decreasing along edges",
			({ edges, source }): void => {
				const n = 5;
				const adj: number[][] = Array.from({ length: n }, () => []);

				for (const [u, v] of edges) {
					if (u !== v) {
						adj[u]?.push(v);
						adj[v]?.push(u);
					}
				}

				// Build CSR
				const rowOffsets = new Uint32Array(n + 1);
				const colIndices: number[] = [];
				for (let i = 0; i < n; i++) {
					rowOffsets[i] = colIndices.length;
					colIndices.push(...(adj[i] ?? []));
				}
				rowOffsets[n] = colIndices.length;

				const result = bfs(rowOffsets, new Uint32Array(colIndices), n, source);

				// Check: for each edge, if both endpoints reached, |levels[u] - levels[v]| <= 1
				for (const [u, v] of edges) {
					const lu = result.levels[u] ?? -1;
					const lv = result.levels[v] ?? -1;
					if (lu >= 0 && lv >= 0) {
						expect(Math.abs(lu - lv)).toBeLessThanOrEqual(1);
					}
				}
			},
		);

		fcIt.prop({
			source: fc.integer({ min: 0, max: 4 }),
		})("source always has level 0", ({ source }): void => {
			// Simple ring graph
			const n = 5;
			const rowOffsets = new Uint32Array(n + 1);
			const colIndices: number[] = [];
			for (let i = 0; i < n; i++) {
				rowOffsets[i] = colIndices.length;
				colIndices.push((i + 1) % n);
				colIndices.push((i - 1 + n) % n);
			}
			rowOffsets[n] = colIndices.length;

			const result = bfs(rowOffsets, new Uint32Array(colIndices), n, source);

			expect(result.levels[source]).toBe(0);
		});
	});
});
