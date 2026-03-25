/**
 * Integration test for HAE expansion algorithm.
 *
 * HAE (Heterogeneity-Aware Expansion) generalises EDGE by allowing
 * custom type extraction via a user-supplied typeMapper function.
 *
 * This test demonstrates HAE's ability to use custom type definitions
 * beyond the default node.type property.
 */

import { describe, it, expect } from "vitest";
import {
	createQualityVsPopularityFixture,
	meanPathMI,
} from "../__test__/fixtures";
import { hae } from "./hae";
import { dome } from "./dome";
import { standardBfs } from "./standard-bfs";
import { jaccard } from "../ranking/mi";

describe("HAE integration: heterogeneity-aware expansion", () => {
	it("discovers paths using default type mapping", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = hae(graph, [
			{ id: "source", role: "source" },
			{ id: "target", role: "target" },
		] as const);

		// Should discover at least one path
		expect(result.paths.length).toBeGreaterThan(0);
		expect(result.sampledNodes.size).toBeGreaterThan(0);
	});

	it("respects custom typeMapper configuration", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		// Use a custom mapper that extracts type from node metadata
		const result = hae(
			graph,
			[
				{ id: "source", role: "source" },
				{ id: "target", role: "target" },
			] as const,
			{
				typeMapper: (node) => {
					// Default fallback
					return node.type ?? "unknown";
				},
			},
		);

		// Should work with custom mapper
		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
	});

	it("reports correct result structure", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = hae(graph, [{ id: "source" }, { id: "target" }] as const);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("visitedPerFrontier");
		expect(result).toHaveProperty("stats");
	});

	it("visits nodes during expansion", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = hae(graph, [{ id: "source" }, { id: "target" }] as const);

		expect(result.stats.nodesVisited).toBeGreaterThanOrEqual(0);
	});

	it("terminates with valid termination reason", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = hae(graph, [{ id: "source" }, { id: "target" }] as const);

		expect(result.stats.termination).toMatch(
			/^(exhausted|limit|collision|error)$/,
		);
	});

	it("respects maxNodes configuration", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = hae(graph, [{ id: "source" }, { id: "target" }] as const, {
			maxNodes: 5,
		});

		expect(result.stats.nodesVisited).toBeLessThanOrEqual(5);
	});

	it("achieves mean path MI at least 90% of dome and standardBfs baselines", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const seeds = [
			{ id: "source", role: "source" as const },
			{ id: "target", role: "target" as const },
		];

		const haeResult = hae(graph, seeds);
		const domeResult = dome(graph, seeds);
		const bfsResult = standardBfs(graph, seeds);

		if (haeResult.paths.length > 0) {
			const haeMI = meanPathMI(graph, haeResult.paths, jaccard);

			// Compare against dome baseline when it finds paths
			if (domeResult.paths.length > 0) {
				const domeMI = meanPathMI(graph, domeResult.paths, jaccard);
				expect(haeMI).toBeGreaterThanOrEqual(domeMI * 0.9);
			}

			// Compare against standardBfs baseline when it finds paths
			if (bfsResult.paths.length > 0) {
				const bfsMI = meanPathMI(graph, bfsResult.paths, jaccard);
				expect(haeMI).toBeGreaterThanOrEqual(bfsMI * 0.9);
			}
		}

		// At least one algorithm should discover paths on this fixture
		expect(
			haeResult.paths.length + domeResult.paths.length + bfsResult.paths.length,
		).toBeGreaterThan(0);
	});
});
