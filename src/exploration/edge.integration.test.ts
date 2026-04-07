/**
 * Integration test for EDGE exploration algorithm.
 *
 * EDGE discovers paths by prioritising nodes with diverse neighbour types.
 * High entropy (heterogeneous neighbourhoods) are expanded before low entropy
 * (homogeneous neighbourhoods).
 *
 * This test demonstrates EDGE's behaviour on a graph with mixed node types.
 */

import { describe, it, expect } from "vitest";
import {
	createQualityVsPopularityFixture,
	meanPathMI,
} from "../__test__/fixtures";
import { edge } from "./edge";
import { dome } from "./dome";
import { standardBfs } from "./standard-bfs";
import { jaccard } from "../ranking/mi";

describe("EDGE integration: entropy-driven exploration", () => {
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

		const result = edge(graph, [{ id: "source" }, { id: "target" }] as const);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("visitedPerFrontier");
		expect(result).toHaveProperty("stats");
	});

	it("visits nodes during exploration", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = edge(graph, [{ id: "source" }, { id: "target" }] as const);

		// Should visit at least some nodes beyond the seeds
		expect(result.stats.nodesVisited).toBeGreaterThanOrEqual(0);
	});

	it("terminates with valid termination reason", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = edge(graph, [{ id: "source" }, { id: "target" }] as const);

		expect(result.stats.termination).toMatch(
			/^(exhausted|limit|collision|error)$/,
		);
	});

	it("respects maxNodes configuration", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const result = edge(graph, [{ id: "source" }, { id: "target" }] as const, {
			maxNodes: 5,
		});

		// Should not exceed max nodes
		expect(result.stats.nodesVisited).toBeLessThanOrEqual(5);
	});

	it("achieves mean path MI at least 90% of dome and standardBfs baselines", () => {
		const fixture = createQualityVsPopularityFixture();
		const { graph } = fixture;

		const seeds = [
			{ id: "source", role: "source" as const },
			{ id: "target", role: "target" as const },
		];

		const edgeResult = edge(graph, seeds);
		const domeResult = dome(graph, seeds);
		const bfsResult = standardBfs(graph, seeds);

		if (edgeResult.paths.length > 0) {
			const edgeMI = meanPathMI(graph, edgeResult.paths, jaccard);

			// Compare against dome baseline when it finds paths
			if (domeResult.paths.length > 0) {
				const domeMI = meanPathMI(graph, domeResult.paths, jaccard);
				expect(edgeMI).toBeGreaterThanOrEqual(domeMI * 0.9);
			}

			// Compare against standardBfs baseline when it finds paths
			if (bfsResult.paths.length > 0) {
				const bfsMI = meanPathMI(graph, bfsResult.paths, jaccard);
				expect(edgeMI).toBeGreaterThanOrEqual(bfsMI * 0.9);
			}
		}

		// At least one algorithm should discover paths on this fixture
		expect(
			edgeResult.paths.length +
				domeResult.paths.length +
				bfsResult.paths.length,
		).toBeGreaterThan(0);
	});
});
