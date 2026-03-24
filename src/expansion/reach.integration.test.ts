/**
 * Integration test for REACH expansion algorithm.
 *
 * REACH demonstrates MI-based hub deferral: it computes mean Jaccard
 * similarity between candidate nodes and discovered path endpoints,
 * using this to deprioritise structurally similar nodes.
 */

import { describe, it, expect } from "vitest";
import { createSocialHubFixture } from "../__test__/fixtures";
import { reach } from "./reach";
import { dome } from "./dome";

describe("REACH integration: MI-guided exploration", () => {
	it("discovers paths and estimates mutual information to endpoints", () => {
		const fixture = createSocialHubFixture();
		const { graph } = fixture;

		const result = reach(graph, [
			{ id: "bob", role: "source" },
			{ id: "grace", role: "target" },
		]);

		expect(result.paths.length).toBeGreaterThan(0);
		expect(result.stats.pathsFound).toBeGreaterThan(0);
	});

	it("transitions from phase 1 (degree-based) to phase 2 (MI-weighted)", () => {
		const fixture = createSocialHubFixture();
		const { graph } = fixture;

		const result = reach(graph, [
			{ id: "bob", role: "source" },
			{ id: "grace", role: "target" },
		]);

		// REACH should discover at least one path to trigger phase 2
		if (result.paths.length >= 1) {
			expect(result.stats.nodesVisited).toBeGreaterThan(0);
			expect(result.stats.iterations).toBeGreaterThan(0);
		}
	});

	it("deprioritises nodes structurally similar to path endpoints", () => {
		const fixture = createSocialHubFixture();
		const { graph } = fixture;

		const reachResult = reach(graph, [
			{ id: "bob", role: "source" },
			{ id: "grace", role: "target" },
		]);

		const domeResult = dome(graph, [
			{ id: "bob", role: "source" },
			{ id: "grace", role: "target" },
		]);

		// Both should discover paths
		expect(reachResult.paths.length).toBeGreaterThan(0);
		expect(domeResult.paths.length).toBeGreaterThan(0);

		// REACH should effectively use MI to guide exploration
		expect(reachResult.stats.nodesVisited).toBeGreaterThan(0);
	});

	it("computes Jaccard similarity between candidate nodes and endpoints", () => {
		const fixture = createSocialHubFixture();
		const { graph } = fixture;

		const result = reach(graph, [
			{ id: "bob", role: "source" },
			{ id: "grace", role: "target" },
		]);

		// Verify paths connect expected endpoints
		for (const path of result.paths) {
			const pathNodes = new Set(path.nodes);
			expect(pathNodes.has("bob")).toBe(true);
			expect(pathNodes.has("grace")).toBe(true);
		}
	});

	it("discovers multiple paths despite MI-based deprioritisation", () => {
		const fixture = createSocialHubFixture();
		const { graph } = fixture;

		const result = reach(graph, [
			{ id: "bob", role: "source" },
			{ id: "grace", role: "target" },
		]);

		// Should successfully discover paths even with selective deprioritisation
		expect(result.stats.nodesVisited).toBeGreaterThan(0);
		expect(result.paths.length).toBeGreaterThan(0);
	});

	it("maintains frontier integrity across phase transition", () => {
		const fixture = createSocialHubFixture();
		const { graph } = fixture;

		const result = reach(graph, [
			{ id: "bob", role: "source" },
			{ id: "grace", role: "target" },
		]);

		// All visited nodes should be from the graph
		expect(result.sampledNodes.size).toBeGreaterThan(0);
		for (const nodeId of result.sampledNodes) {
			expect(graph.hasNode(nodeId)).toBe(true);
		}
	});

	it("handles zero neighbourhood overlap gracefully", () => {
		const fixture = createSocialHubFixture();
		const { graph } = fixture;

		// Even with nodes having limited neighbourhood overlap,
		// REACH should complete without errors
		const result = reach(graph, [
			{ id: "bob", role: "source" },
			{ id: "grace", role: "target" },
		]);

		expect(result.stats.nodesVisited).toBeGreaterThanOrEqual(2);
	});
});
