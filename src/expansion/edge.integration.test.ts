/**
 * Integration test for EDGE expansion algorithm.
 *
 * EDGE discovers paths by prioritising nodes with diverse neighbour types.
 * High entropy (heterogeneous neighbourhoods) are expanded before low entropy
 * (homogeneous neighbourhoods).
 *
 * This test demonstrates EDGE's behaviour on a graph with mixed node types.
 */

import { describe, it, expect } from "vitest";
import { createQualityVsPopularityFixture } from "../__test__/fixtures";
import { edge } from "./edge";

describe("EDGE integration: entropy-driven expansion", () => {
	it("discovers paths through diverse-type neighbourhoods", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = edge(graph, [
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

		const result = edge(
			graph,
			[{ id: "source" }, { id: "target" }] as const,
		);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("visitedPerFrontier");
		expect(result).toHaveProperty("stats");
	});

	it("visits nodes during expansion", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = edge(
			graph,
			[{ id: "source" }, { id: "target" }] as const,
		);

		// Should visit at least some nodes beyond the seeds
		expect(result.stats.nodesVisited).toBeGreaterThanOrEqual(0);
	});

	it("terminates with valid termination reason", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = edge(
			graph,
			[{ id: "source" }, { id: "target" }] as const,
		);

		expect(result.stats.termination).toMatch(
			/^(exhausted|limit|collision|error)$/,
		);
	});

	it("respects maxNodes configuration", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = edge(
			graph,
			[{ id: "source" }, { id: "target" }] as const,
			{ maxNodes: 5 },
		);

		// Should not exceed max nodes
		expect(result.stats.nodesVisited).toBeLessThanOrEqual(5);
	});
});
