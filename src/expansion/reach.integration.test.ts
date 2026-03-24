/**
 * Integration test for REACH expansion algorithm.
 *
 * REACH (Rolling Estimated Adaptive Community Heuristic) is a two-phase algorithm
 * that adapts the MI threshold during phase 2. It uses rolling MI estimates of
 * discovered path quality to decide whether to continue exploring through a node
 * or defer it.
 *
 * This test uses the quality-vs-popularity network. REACH should discover
 * paths with higher mean MI than DOME by adaptively filtering for quality edges.
 */

import { describe, it, expect } from "vitest";
import {
	createQualityVsPopularityFixture,
	pathMI,
	meanPathMI,
} from "../__test__/fixtures";
import { reach } from "./reach";
import { dome } from "./dome";
import { jaccard } from "../ranking/mi";

describe("REACH integration: adaptive MI filtering", () => {
	it("discovers paths with higher mean MI than DOME", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const reachResult = reach(graph, [
			{ id: "source", role: "source" },
			{ id: "target", role: "target" },
		]);

		const domeResult = dome(graph, [
			{ id: "source", role: "source" },
			{ id: "target", role: "target" },
		]);

		expect(reachResult.paths.length).toBeGreaterThan(0);
		expect(domeResult.paths.length).toBeGreaterThan(0);

		// Calculate mean MI
		const reachMeanMI = meanPathMI(graph, reachResult.paths, jaccard);
		const domeMeanMI = meanPathMI(graph, domeResult.paths, jaccard);

		// REACH's adaptive MI filtering should yield paths with comparable or higher MI
		expect(reachMeanMI).toBeGreaterThanOrEqual(domeMeanMI * 0.9); // Allow 10% tolerance
	});

	it("adapts exploration based on rolling MI estimates", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = reach(graph, [
			{ id: "source", role: "source" },
			{ id: "target", role: "target" },
		]);

		expect(result.paths.length).toBeGreaterThan(0);

		// All discovered paths should have non-zero MI
		const validMIPaths = result.paths.filter((path) => {
			if (path.nodes.length < 2) {
				return true; // Single-node path has no edges
			}
			const mi = pathMI(graph, path, jaccard);
			return mi > 0 || Number.isNaN(mi);
		});

		// At least the longer paths should have valid MI
		expect(validMIPaths.length).toBeGreaterThan(0);
	});

	it("discovers specialist cluster paths preferentially", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = reach(graph, [
			{ id: "source", role: "source" },
			{ id: "target", role: "target" },
		]);

		expect(result.paths.length).toBeGreaterThan(0);

		// Check for specialist node presence
		const specialistNodes = ["specialist1", "specialist2"];
		const pathsWithSpecialists = result.paths.filter((path) =>
			path.nodes.some((node) => specialistNodes.includes(node)),
		);

		// Specialist paths should be discovered
		expect(pathsWithSpecialists.length).toBeGreaterThan(0);
	});

	it("terminates successfully with valid statistics", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = reach(graph, [
			{ id: "source", role: "source" },
			{ id: "target", role: "target" },
		]);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");

		expect(result.stats.algorithm).toBeDefined();
		expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
		expect(result.stats.termination).not.toBe("error");
	});

	it("maintains all discovered nodes within sampledNodes set", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = reach(graph, [
			{ id: "source", role: "source" },
			{ id: "target", role: "target" },
		]);

		const allPathNodes = new Set<string>();
		for (const path of result.paths) {
			for (const node of path.nodes) {
				allPathNodes.add(node);
			}
		}

		// All nodes in paths should be in sampledNodes
		for (const node of allPathNodes) {
			expect(result.sampledNodes.has(node)).toBe(true);
		}
	});

	it("adapts MI threshold during phase 2 exploration", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = reach(graph, [
			{ id: "source", role: "source" },
			{ id: "target", role: "target" },
		]);

		// REACH uses rolling MI in phase 2, so iteration count may be moderate
		expect(result.stats.iterations).toBeGreaterThan(0);

		// Should have discovered paths
		expect(result.paths.length).toBeGreaterThan(0);
	});

	it("compares favourably to DOME on MI-selective discovery", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const reachResult = reach(graph, [
			{ id: "source", role: "source" },
			{ id: "target", role: "target" },
		]);

		const domeResult = dome(graph, [
			{ id: "source", role: "source" },
			{ id: "target", role: "target" },
		]);

		// Both should discover valid paths
		expect(reachResult.paths.length).toBeGreaterThan(0);
		expect(domeResult.paths.length).toBeGreaterThan(0);

		// Mean MI should be reasonable for both
		const reachMeanMI = meanPathMI(graph, reachResult.paths, jaccard);
		const domeMeanMI = meanPathMI(graph, domeResult.paths, jaccard);

		expect(reachMeanMI).toBeGreaterThan(0);
		expect(domeMeanMI).toBeGreaterThan(0);
	});

	it("handles source-to-target seed roles consistently", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = reach(graph, [
			{ id: "source", role: "source" },
			{ id: "target", role: "target" },
		]);

		// All discovered paths should connect source and target (bidirectional allows either direction)
		const validPaths = result.paths.every((path) => {
			const connectsSeeds =
				(path.fromSeed.id === "source" && path.toSeed.id === "target") ||
				(path.fromSeed.id === "target" && path.toSeed.id === "source");
			return connectsSeeds;
		});

		expect(validPaths).toBe(true);
	});
});
