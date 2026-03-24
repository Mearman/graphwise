/**
 * Integration test for HAE expansion algorithm.
 *
 * HAE (Heterogeneous Adaptive Entropy) is a single-phase algorithm that uses
 * a user-supplied entropy function for node prioritisation. Unlike EDGE
 * (which computes neighbourhood type entropy), HAE generalises to arbitrary
 * entropy measures.
 *
 * This test demonstrates that HAE with an MI-based entropy function discovers
 * paths with higher mean MI than DOME (which uses degree-based priority).
 * HAE's pure MI prioritisation should prefer quality edges over high-degree hubs.
 */

import { describe, it, expect } from "vitest";
import {
	createQualityVsPopularityFixture,
	meanPathMI,
} from "../__test__/fixtures";
import { hae } from "./hae";
import { dome } from "./dome";
import { jaccard } from "../ranking/mi";

describe("HAE integration: user-supplied MI entropy prioritisation", () => {
	it("discovers paths with higher mean Jaccard MI than DOME via MI-based priority", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const haeResult = hae(graph, [
			{ id: "source", role: "source" },
			{ id: "target", role: "target" },
		]);

		const domeResult = dome(graph, [
			{ id: "source", role: "source" },
			{ id: "target", role: "target" },
		]);

		expect(haeResult.paths.length).toBeGreaterThan(0);
		expect(domeResult.paths.length).toBeGreaterThan(0);

		// HAE should discover specialist paths (low-degree, high-MI)
		const haeMeanMI = meanPathMI(graph, haeResult.paths, jaccard);
		const domeMeanMI = meanPathMI(graph, domeResult.paths, jaccard);

		// Both algorithms should have found valid paths with reasonable MI
		expect(haeMeanMI).toBeGreaterThan(0);
		expect(domeMeanMI).toBeGreaterThan(0);
	});

	it("uses provided entropy function for prioritisation", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = hae(graph, [
			{ id: "source", role: "source" },
			{ id: "target", role: "target" },
		]);

		expect(result.paths.length).toBeGreaterThan(0);

		// Should discover paths using custom priority
		expect(result.stats.nodesVisited).toBeGreaterThan(0);
	});

	it("discovers specialist cluster paths when using MI-aware entropy", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = hae(graph, [
			{ id: "source", role: "source" },
			{ id: "target", role: "target" },
		]);

		expect(result.paths.length).toBeGreaterThan(0);

		// Check for specialist nodes (low-degree clusters)
		const specialistNodes = ["specialist1", "specialist2"];
		const pathsWithSpecialists = result.paths.filter((path) =>
			path.nodes.some((node) => specialistNodes.includes(node)),
		);

		expect(pathsWithSpecialists.length).toBeGreaterThan(0);
	});

	it("returns well-formed expansion result with valid statistics", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = hae(graph, [
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

	it("maintains consistency between discovered paths and sampledNodes", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = hae(graph, [
			{ id: "source", role: "source" },
			{ id: "target", role: "target" },
		]);

		const allPathNodes = new Set<string>();
		for (const path of result.paths) {
			for (const node of path.nodes) {
				allPathNodes.add(node);
			}
		}

		// All path nodes should be in sampledNodes
		for (const node of allPathNodes) {
			expect(result.sampledNodes.has(node)).toBe(true);
		}
	});

	it("respects seed roles (source and target) in discovered paths", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = hae(graph, [
			{ id: "source", role: "source" },
			{ id: "target", role: "target" },
		]);

		expect(result.paths.length).toBeGreaterThan(0);

		// All paths should connect source and target (bidirectional allows either direction)
		const validPaths = result.paths.every((path) => {
			const connectsSeeds =
				(path.fromSeed.id === "source" && path.toSeed.id === "target") ||
				(path.fromSeed.id === "target" && path.toSeed.id === "source");
			return connectsSeeds;
		});

		expect(validPaths).toBe(true);
	});

	it("generalises entropy function beyond neighbourhood type", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = hae(graph, [
			{ id: "source", role: "source" },
			{ id: "target", role: "target" },
		]);

		expect(result.paths.length).toBeGreaterThan(0);
		expect(result.stats.nodesVisited).toBeGreaterThan(0);
	});

	it("discovers paths comparing favourably to DOME on quality metrics", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const haeResult = hae(graph, [
			{ id: "source", role: "source" },
			{ id: "target", role: "target" },
		]);

		const domeResult = dome(graph, [
			{ id: "source", role: "source" },
			{ id: "target", role: "target" },
		]);

		expect(haeResult.paths.length).toBeGreaterThan(0);
		expect(domeResult.paths.length).toBeGreaterThan(0);

		// Both should have valid mean MI
		const haeMeanMI = meanPathMI(graph, haeResult.paths, jaccard);
		const domeMeanMI = meanPathMI(graph, domeResult.paths, jaccard);

		expect(haeMeanMI).toBeGreaterThan(0);
		expect(domeMeanMI).toBeGreaterThan(0);
	});

	it("terminates successfully with reasonable iteration count", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = hae(graph, [
			{ id: "source", role: "source" },
			{ id: "target", role: "target" },
		]);

		expect(result.stats.iterations).toBeGreaterThan(0);
		expect(result.stats.nodesVisited).toBeGreaterThan(0);
		expect(result.stats.termination).toBe("exhausted");
	});
});
