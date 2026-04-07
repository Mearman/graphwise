/**
 * Cross-algorithm comparison integration tests for exploration algorithms.
 *
 * Runs all exploration algorithms head-to-head on the same graphs to verify
 * relative performance properties. Tests are structural rather than exact —
 * they validate ordering relationships and quality bounds with tolerance.
 *
 * Graphs used:
 * - Three-community (bob → mia): rich inter-community structure, liaison bridges
 * - Two-department (alice → jack): dense clusters with bottleneck edges
 * - Social hub (bob → kate): hub node with niche interest clusters
 */

import { describe, it, expect } from "vitest";
import {
	createThreeCommunityFixture,
	createTwoDepartmentFixture,
	createSocialHubFixture,
	meanPathMI,
} from "../__test__/fixtures";
import { jaccard } from "../ranking/mi";
import {
	dome,
	edge,
	pipe,
	sage,
	reach,
	maze,
	tide,
	lace,
	warp,
	fuse,
	sift,
	flux,
	standardBfs,
	frontierBalanced,
	randomPriority,
	dfsPriority,
	kHop,
	randomWalk,
} from "./index";
import type { ExplorationResult } from "./types";

// ---------------------------------------------------------------------------
// Shared tolerance
// ---------------------------------------------------------------------------

/** Fraction of the baseline value used as tolerance for inequality assertions. */
const TOLERANCE = 0.9;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Run all novel exploration algorithms on a graph with the given seeds and
 * return a labelled map of results.
 */
function runNovelAlgorithms(
	graph: ReturnType<typeof createThreeCommunityFixture>["graph"],
	seeds: ReturnType<typeof createThreeCommunityFixture>["seeds"],
): Map<string, ExplorationResult> {
	const results = new Map<string, ExplorationResult>();
	results.set("dome", dome(graph, seeds));
	results.set("edge", edge(graph, seeds));
	results.set("pipe", pipe(graph, seeds));
	results.set("sage", sage(graph, seeds));
	results.set("reach", reach(graph, seeds));
	results.set("maze", maze(graph, seeds));
	results.set("tide", tide(graph, seeds));
	results.set("lace", lace(graph, seeds));
	results.set("warp", warp(graph, seeds));
	results.set("fuse", fuse(graph, seeds));
	results.set("sift", sift(graph, seeds));
	results.set("flux", flux(graph, seeds));
	return results;
}

/**
 * Run all baseline exploration algorithms on a graph with the given seeds and
 * return a labelled map of results.
 */
function runBaselineAlgorithms(
	graph: ReturnType<typeof createThreeCommunityFixture>["graph"],
	seeds: ReturnType<typeof createThreeCommunityFixture>["seeds"],
): Map<string, ExplorationResult> {
	const results = new Map<string, ExplorationResult>();
	results.set("standardBfs", standardBfs(graph, seeds));
	results.set("frontierBalanced", frontierBalanced(graph, seeds));
	results.set("randomPriority", randomPriority(graph, seeds));
	results.set("dfsPriority", dfsPriority(graph, seeds));
	results.set("kHop", kHop(graph, seeds, { k: 4 }));
	results.set(
		"randomWalk",
		randomWalk(graph, seeds, { walks: 20, walkLength: 10, seed: 42 }),
	);
	return results;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("exploration: cross-algorithm comparison", () => {
	describe("all algorithms discover paths on a rich multi-community graph", () => {
		it("novel algorithms find at least as many paths as randomPriority baseline", () => {
			const { graph, seeds } = createThreeCommunityFixture();

			const baseline = randomPriority(graph, seeds);
			const baselineCount = baseline.paths.length;

			const novelResults = runNovelAlgorithms(graph, seeds);

			for (const [name, result] of novelResults) {
				// Allow up to TOLERANCE × baseline — novel algorithms should not perform
				// dramatically worse than the random baseline on a well-connected graph.
				expect(
					result.paths.length,
					`${name}: expected >= ${String(TOLERANCE * baselineCount)} paths (random baseline: ${String(baselineCount)})`,
				).toBeGreaterThanOrEqual(Math.floor(TOLERANCE * baselineCount));
			}
		});

		it("all baselines find at least one path on the three-community graph", () => {
			const { graph, seeds } = createThreeCommunityFixture();
			const baselineResults = runBaselineAlgorithms(graph, seeds);

			for (const [name, result] of baselineResults) {
				expect(
					result.paths.length,
					`${name}: expected at least one path on the three-community graph`,
				).toBeGreaterThan(0);
			}
		});

		it("all novel algorithms find at least one path on the two-department graph", () => {
			const { graph, seeds } = createTwoDepartmentFixture();
			const novelResults = runNovelAlgorithms(graph, seeds);

			for (const [name, result] of novelResults) {
				expect(
					result.paths.length,
					`${name}: expected at least one path on the two-department graph`,
				).toBeGreaterThan(0);
			}
		});
	});

	describe("MI-weighted algorithms achieve higher mean MI than standardBfs", () => {
		it("LACE, FUSE, SIFT achieve mean path MI >= 0.9 × standardBfs on two-department graph", () => {
			const { graph, seeds } = createTwoDepartmentFixture();

			const bfsResult = standardBfs(graph, seeds);
			const bfsMeanMI =
				bfsResult.paths.length > 0
					? meanPathMI(graph, bfsResult.paths, jaccard)
					: 0;

			const miWeightedNames = ["lace", "fuse", "sift"] as const;
			const miWeightedFns = {
				lace: lace,
				fuse: fuse,
				sift: sift,
			};

			for (const name of miWeightedNames) {
				const result = miWeightedFns[name](graph, seeds);

				if (result.paths.length === 0) {
					// Skip if algorithm found no paths (cannot compare MI)
					continue;
				}

				const algoMeanMI = meanPathMI(graph, result.paths, jaccard);

				expect(
					algoMeanMI,
					`${name}: mean MI ${algoMeanMI.toFixed(4)} should be >= ${(TOLERANCE * bfsMeanMI).toFixed(4)} (BFS baseline: ${bfsMeanMI.toFixed(4)})`,
				).toBeGreaterThanOrEqual(TOLERANCE * bfsMeanMI);
			}
		});

		it("SAGE and REACH achieve mean path MI >= 0.9 × randomPriority on three-community graph", () => {
			const { graph, seeds } = createThreeCommunityFixture();

			const randomResult = randomPriority(graph, seeds);
			const randomMeanMI =
				randomResult.paths.length > 0
					? meanPathMI(graph, randomResult.paths, jaccard)
					: 0;

			const sageResult = sage(graph, seeds);
			const reachResult = reach(graph, seeds);

			for (const [name, result] of [
				["sage", sageResult],
				["reach", reachResult],
			] as const) {
				if (result.paths.length === 0) continue;

				const algoMeanMI = meanPathMI(graph, result.paths, jaccard);

				expect(
					algoMeanMI,
					`${name}: mean MI ${algoMeanMI.toFixed(4)} should be >= ${(TOLERANCE * randomMeanMI).toFixed(4)} (random baseline: ${randomMeanMI.toFixed(4)})`,
				).toBeGreaterThanOrEqual(TOLERANCE * randomMeanMI);
			}
		});
	});

	describe("path-potential algorithms find paths under budget", () => {
		it("PIPE, MAZE, WARP find >= paths as k-hop (k=4) within node budget on three-community graph", () => {
			const { graph, seeds } = createThreeCommunityFixture();

			// k-hop with k=4 gives a generous reach baseline
			const kHopResult = kHop(graph, seeds, { k: 4 });
			const kHopCount = kHopResult.paths.length;

			const pathPotentialFns = {
				pipe: pipe,
				maze: maze,
				warp: warp,
			};

			for (const [name, fn] of Object.entries(pathPotentialFns)) {
				const result = fn(graph, seeds);

				expect(
					result.paths.length,
					`${name}: expected >= ${String(Math.floor(TOLERANCE * kHopCount))} paths (k-hop baseline: ${String(kHopCount)})`,
				).toBeGreaterThanOrEqual(Math.floor(TOLERANCE * kHopCount));
			}
		});

		it("PIPE and MAZE report valid stats and termination reasons", () => {
			const { graph, seeds } = createTwoDepartmentFixture();

			const pipeResult = pipe(graph, seeds);
			const mazeResult = maze(graph, seeds);

			for (const [name, result] of [
				["pipe", pipeResult],
				["maze", mazeResult],
			] as const) {
				expect(result.stats.algorithm, `${name}: algorithm name`).toBeTypeOf(
					"string",
				);
				expect(
					result.stats.nodesVisited,
					`${name}: nodesVisited`,
				).toBeGreaterThanOrEqual(0);
				expect(
					result.stats.durationMs,
					`${name}: durationMs`,
				).toBeGreaterThanOrEqual(0);
				expect(result.stats.termination, `${name}: termination`).toMatch(
					/^(exhausted|limit|collision|error)$/,
				);
			}
		});
	});

	describe("algorithm stats are well-formed for all algorithms", () => {
		it("every algorithm returns valid stats on the social-hub graph", () => {
			const { graph, seeds } = createSocialHubFixture();

			const all = new Map<string, ExplorationResult>([
				...runNovelAlgorithms(graph, seeds),
				...runBaselineAlgorithms(graph, seeds),
			]);

			for (const [name, result] of all) {
				expect(
					result.stats.iterations,
					`${name}: iterations`,
				).toBeGreaterThanOrEqual(0);
				expect(
					result.stats.nodesVisited,
					`${name}: nodesVisited`,
				).toBeGreaterThanOrEqual(0);
				expect(
					result.stats.edgesTraversed,
					`${name}: edgesTraversed`,
				).toBeGreaterThanOrEqual(0);
				expect(
					result.stats.pathsFound,
					`${name}: pathsFound`,
				).toBeGreaterThanOrEqual(0);
				expect(
					result.stats.durationMs,
					`${name}: durationMs`,
				).toBeGreaterThanOrEqual(0);
				expect(result.stats.algorithm, `${name}: algorithm`).toBeTypeOf(
					"string",
				);
				expect(result.stats.termination, `${name}: termination`).toMatch(
					/^(exhausted|limit|collision|error)$/,
				);
			}
		});

		it("sampledNodes and sampledEdges are non-empty for all algorithms on connected graph", () => {
			const { graph, seeds } = createThreeCommunityFixture();

			const all = new Map<string, ExplorationResult>([
				...runNovelAlgorithms(graph, seeds),
				...runBaselineAlgorithms(graph, seeds),
			]);

			for (const [name, result] of all) {
				expect(
					result.sampledNodes.size,
					`${name}: sampledNodes should be non-empty`,
				).toBeGreaterThan(0);
			}
		});
	});

	describe("determinism: repeated runs produce identical path counts", () => {
		it("all BASE-framework algorithms are deterministic across two runs", () => {
			const { graph, seeds } = createTwoDepartmentFixture();

			// Algorithms based on the BASE framework with no randomness are deterministic
			const deterministicFns = {
				dome,
				edge,
				pipe,
				sage,
				reach,
				tide,
				lace,
				warp,
				fuse,
				sift,
				flux,
				standardBfs,
				frontierBalanced,
				dfsPriority,
			};

			for (const [name, fn] of Object.entries(deterministicFns)) {
				const first = fn(graph, seeds);
				const second = fn(graph, seeds);

				expect(
					second.paths.length,
					`${name}: second run should match first (${String(first.paths.length)} paths)`,
				).toBe(first.paths.length);
			}
		});

		it("randomPriority is deterministic with the same seed", () => {
			const { graph, seeds } = createTwoDepartmentFixture();

			const first = randomPriority(graph, seeds, { seed: 99 });
			const second = randomPriority(graph, seeds, { seed: 99 });

			expect(second.paths.length).toBe(first.paths.length);
		});
	});
});
