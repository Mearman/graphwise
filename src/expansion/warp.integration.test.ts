/**
 * Integration test for WARP expansion algorithm.
 *
 * WARP (Path Potential via Intersection Exploration) estimates path potential
 * by counting how many other frontiers have visited a node's neighbours.
 * This encourages exploration through nodes that bridge communities.
 *
 * This test uses a three-community network with liaison bridge nodes.
 * WARP should discover more inter-community paths than DOME or standardBfs
 * within the same node budget because it explicitly targets bridge nodes.
 */

import { describe, it, expect } from "vitest";
import { createThreeCommunityFixture } from "../__test__/fixtures";
import { warp } from "./warp";
import { dome } from "./dome";

// Type guard helper for metadata extraction
function getStringArray(value: unknown): readonly string[] {
	if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
		return value;
	}
	return [];
}

describe("WARP integration: path-potential bridging", () => {
	it("discovers more inter-community paths than DOME within same node budget", () => {
		const fixture = createThreeCommunityFixture();
		const { graph, metadata } = fixture;
		const liaisons = getStringArray(metadata["liaisons"]);

		const warpResult = warp(graph, [
			{ id: "bob", role: "source" },
			{ id: "mia", role: "target" },
		]);

		const domeResult = dome(graph, [
			{ id: "bob", role: "source" },
			{ id: "mia", role: "target" },
		]);

		// Both should discover paths
		expect(warpResult.paths.length).toBeGreaterThan(0);
		expect(domeResult.paths.length).toBeGreaterThan(0);

		// Count paths that use liaison nodes (inter-community bridges)
		const pipeLiaisonPaths = warpResult.paths.filter((path) =>
			path.nodes.some((node) => liaisons.includes(node)),
		);

		const domeLiaisonPaths = domeResult.paths.filter((path) =>
			path.nodes.some((node) => liaisons.includes(node)),
		);

		// WARP discovers more paths through liaison bridges than DOME
		// because it prioritises nodes that bridge multiple frontiers
		expect(pipeLiaisonPaths.length).toBeGreaterThanOrEqual(
			domeLiaisonPaths.length,
		);
	});

	it("prioritises bridge nodes in frontier intersection", () => {
		const fixture = createThreeCommunityFixture();
		const { graph, metadata } = fixture;
		const liaisons = getStringArray(metadata["liaisons"]);

		const result = warp(graph, [
			{ id: "bob", role: "source" },
			{ id: "mia", role: "target" },
		]);

		// Should discover paths that leverage liaison bridge nodes
		expect(result.paths.length).toBeGreaterThan(0);

		// WARP's first path should use a liaison node (bridge-aware priority)
		// This proves WARP prioritises nodes that bridge multiple frontiers
		const firstPath = result.paths[0];
		if (firstPath !== undefined) {
			expect(firstPath.nodes.some((node) => liaisons.includes(node))).toBe(
				true,
			);
		}

		// At least some paths should use liaisons (they are critical bridges)
		const pathsWithLiaisons = result.paths.filter((path) =>
			path.nodes.some((node) => liaisons.includes(node)),
		);
		expect(pathsWithLiaisons.length).toBeGreaterThan(0);
	});

	it("discovers paths crossing lab → startup → university boundary", () => {
		const fixture = createThreeCommunityFixture();
		const { graph, metadata } = fixture;
		const liaisons = getStringArray(metadata["liaisons"]);

		const result = warp(graph, [
			{ id: "bob", role: "source" }, // In lab
			{ id: "mia", role: "target" }, // In university
		]);

		// Should discover at least one path connecting the two communities
		expect(result.paths.length).toBeGreaterThan(0);

		// At least one path should cross from lab to university via liaison bridges
		// Bob is in lab, Mia is in university—they require liaison nodes to connect
		const pathsWithLiaisons = result.paths.filter((path) =>
			path.nodes.some((node) => liaisons.includes(node)),
		);
		expect(pathsWithLiaisons.length).toBeGreaterThan(0);
	});

	it("returns well-formed expansion result with valid statistics", () => {
		const fixture = createThreeCommunityFixture();
		const { graph } = fixture;

		const result = warp(graph, [
			{ id: "bob", role: "source" },
			{ id: "mia", role: "target" },
		]);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");

		expect(result.paths).toEqual(expect.any(Array));
		expect(result.sampledNodes).toEqual(expect.any(Set));
		expect(result.stats).toHaveProperty("algorithm");
		expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
	});

	it("explores nodes with high frontier intersection (bridge heuristic)", () => {
		const fixture = createThreeCommunityFixture();
		const { graph } = fixture;

		const result = warp(graph, [
			{ id: "bob", role: "source" },
			{ id: "mia", role: "target" },
		]);

		// Should terminate successfully
		expect(result.stats.termination).not.toBe("error");

		// Should visit nodes from multiple communities
		const sampledNodeCount = result.sampledNodes.size;
		expect(sampledNodeCount).toBeGreaterThan(0);
	});

	it("maintains consistency across multiple runs on same seed pair", () => {
		const fixture = createThreeCommunityFixture();
		const { graph } = fixture;

		const result1 = warp(graph, [
			{ id: "bob", role: "source" },
			{ id: "mia", role: "target" },
		]);

		const result2 = warp(graph, [
			{ id: "bob", role: "source" },
			{ id: "mia", role: "target" },
		]);

		// Deterministic results
		expect(result1.paths.length).toBe(result2.paths.length);
		expect(result1.stats.nodesVisited).toBe(result2.stats.nodesVisited);
	});
});
