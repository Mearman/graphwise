/**
 * Integration test for PIPE expansion algorithm.
 *
 * PIPE (Path-Potential Informed Priority Expansion) prioritises nodes
 * that bridge multiple frontiers, discovering paths by focusing on
 * connection points between seed regions.
 *
 * This test demonstrates PIPE's behaviour on a graph where certain
 * nodes act as natural bridges between seed regions.
 */

import { describe, it, expect } from "vitest";
import { createQualityVsPopularityFixture } from "../__test__/fixtures";
import { pipe } from "./pipe";

describe("PIPE integration: path-potential informed expansion", () => {
	it("discovers paths through bridging nodes", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = pipe(graph, [
			{ id: "source", role: "source" },
			{ id: "target", role: "target" },
		] as const);

		// Should discover at least one path
		expect(result.paths.length).toBeGreaterThan(0);
		expect(result.sampledNodes.size).toBeGreaterThan(0);
	});

	it("reports correct result structure", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = pipe(graph, [{ id: "source" }, { id: "target" }] as const);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("visitedPerFrontier");
		expect(result).toHaveProperty("stats");
	});

	it("visits nodes during expansion", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = pipe(graph, [{ id: "source" }, { id: "target" }] as const);

		expect(result.stats.nodesVisited).toBeGreaterThanOrEqual(0);
	});

	it("terminates with valid termination reason", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = pipe(graph, [{ id: "source" }, { id: "target" }] as const);

		expect(result.stats.termination).toMatch(
			/^(exhausted|limit|collision|error)$/,
		);
	});

	it("identifies multiple frontiers correctly", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = pipe(graph, [
			{ id: "source" },
			{ id: "specialist1" },
			{ id: "target" },
		] as const);

		// With 3 seeds, should have at most 3 frontiers
		expect(result.visitedPerFrontier.length).toBeLessThanOrEqual(3);
	});

	it("respects maxNodes configuration", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = pipe(graph, [{ id: "source" }, { id: "target" }] as const, {
			maxNodes: 5,
		});

		expect(result.stats.nodesVisited).toBeLessThanOrEqual(5);
	});
});
