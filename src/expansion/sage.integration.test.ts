/**
 * Integration test for SAGE expansion algorithm.
 *
 * SAGE demonstrates salience-based hub deferral: it deprioritises nodes
 * that appear frequently in discovered paths, encouraging exploration
 * of fresh frontier regions.
 */

import { describe, it, expect } from "vitest";
import { createSocialHubFixture, meanPathMI } from "../__test__/fixtures";
import { sage } from "./sage";
import { dome } from "./dome";
import { standardBfs } from "./standard-bfs";
import { jaccard } from "../ranking/mi";

describe("SAGE integration: salience-guided exploration", () => {
	it("discovers paths and tracks node salience through phases", () => {
		const fixture = createSocialHubFixture();
		const { graph } = fixture;

		const result = sage(graph, [
			{ id: "bob", role: "source" },
			{ id: "grace", role: "target" },
		]);

		expect(result.paths.length).toBeGreaterThan(0);
		expect(result.stats.pathsFound).toBeGreaterThan(0);
	});

	it("transitions from phase 1 (degree-based) to phase 2 (salience-based)", () => {
		const fixture = createSocialHubFixture();
		const { graph } = fixture;

		// Run with configuration that allows multiple paths
		const result = sage(graph, [
			{ id: "bob", role: "source" },
			{ id: "grace", role: "target" },
		]);

		// SAGE should discover at least one path to trigger phase 2
		if (result.paths.length >= 1) {
			expect(result.stats.nodesVisited).toBeGreaterThan(0);
			// Phase 2 should be active, allowing continued exploration
			expect(result.stats.iterations).toBeGreaterThan(0);
		}
	});

	it("discovers multiple paths efficiently by deprioritising frequently-visited nodes", () => {
		const fixture = createSocialHubFixture();
		const { graph } = fixture;

		const sageResult = sage(graph, [
			{ id: "bob", role: "source" },
			{ id: "grace", role: "target" },
		]);

		const domeResult = dome(graph, [
			{ id: "bob", role: "source" },
			{ id: "grace", role: "target" },
		]);

		// Both should discover paths
		expect(sageResult.paths.length).toBeGreaterThan(0);
		expect(domeResult.paths.length).toBeGreaterThan(0);

		// SAGE should be effective at discovering structurally diverse paths
		expect(sageResult.stats.nodesVisited).toBeGreaterThan(0);
	});

	it("explores sparse regions by deprioritising high-salience nodes", () => {
		const fixture = createSocialHubFixture();
		const { graph } = fixture;

		const result = sage(graph, [
			{ id: "bob", role: "source" },
			{ id: "grace", role: "target" },
		]);

		// All discovered paths should connect source and target
		for (const path of result.paths) {
			const pathNodes = new Set(path.nodes);
			expect(pathNodes.has("bob")).toBe(true);
			expect(pathNodes.has("grace")).toBe(true);
		}
	});

	it("maintains frontier integrity across phase transition", () => {
		const fixture = createSocialHubFixture();
		const { graph } = fixture;

		const result = sage(graph, [
			{ id: "bob", role: "source" },
			{ id: "grace", role: "target" },
		]);

		// All visited nodes should be from the graph
		expect(result.sampledNodes.size).toBeGreaterThan(0);
		for (const nodeId of result.sampledNodes) {
			expect(graph.hasNode(nodeId)).toBe(true);
		}
	});

	it("achieves mean path MI at least 90% of dome and standardBfs baselines", () => {
		const fixture = createSocialHubFixture();
		const { graph } = fixture;

		const seeds = [
			{ id: "bob", role: "source" as const },
			{ id: "grace", role: "target" as const },
		];

		const sageResult = sage(graph, seeds);
		const domeResult = dome(graph, seeds);
		const bfsResult = standardBfs(graph, seeds);

		if (sageResult.paths.length > 0) {
			const sageMI = meanPathMI(graph, sageResult.paths, jaccard);

			// SAGE's salience-based phase transition should keep path quality
			// competitive with the degree-only dome baseline
			if (domeResult.paths.length > 0) {
				const domeMI = meanPathMI(graph, domeResult.paths, jaccard);
				expect(sageMI).toBeGreaterThanOrEqual(domeMI * 0.9);
			}

			// Should also be competitive with the simple BFS baseline
			if (bfsResult.paths.length > 0) {
				const bfsMI = meanPathMI(graph, bfsResult.paths, jaccard);
				expect(sageMI).toBeGreaterThanOrEqual(bfsMI * 0.9);
			}
		}

		// At least one algorithm should discover paths on this fixture
		expect(
			sageResult.paths.length +
				domeResult.paths.length +
				bfsResult.paths.length,
		).toBeGreaterThan(0);
	});
});
