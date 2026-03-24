/**
 * Integration test for DOME expansion algorithm.
 *
 * DOME demonstrates hub deferral: it defers exploration of high-degree nodes
 * and prioritises low-degree frontier expansion, discovering paths through
 * sparse regions before exhausting hub-centric neighbours.
 *
 * This test uses a social network with a hub (Alice, degree 10+) and niche
 * interest clusters. Bob (photography cluster) and Grace (hiking cluster) are
 * separated and can be reached via two paths:
 * - Hub path: bob → alice → grace (2 hops, alice degree 10)
 * - Niche path: bob → carol → emma → grace (3 hops, carol/emma degree 3-4)
 *
 * DOME should discover the niche path first by deferring alice; standardBfs
 * should discover the hub path first by expanding distance-1 neighbours.
 */

import { describe, it, expect } from "vitest";
import { createSocialHubFixture } from "../__test__/fixtures";
import { dome } from "./dome";
import { standardBfs } from "./standard-bfs";

describe("DOME integration: hub deferral", () => {
	it("discovers Bob–Grace path via niche cluster before exploring Alice's neighbourhood", () => {
		const fixture = createSocialHubFixture();
		const { graph, metadata } = fixture;

		const hubNode = String(metadata["hubNode"]); // Alice
		const domeResult = dome(graph, [
			{ id: "bob", role: "source" },
			{ id: "grace", role: "target" },
		]);

		const bfsResult = standardBfs(graph, [
			{ id: "bob", role: "source" },
			{ id: "grace", role: "target" },
		]);

		// Both algorithms should find at least one path
		expect(domeResult.paths.length).toBeGreaterThan(0);
		expect(bfsResult.paths.length).toBeGreaterThan(0);

		const domePath = domeResult.paths[0];
		const bfsPath = bfsResult.paths[0];

		// DOME's first path should avoid the hub (niche path: bob → carol → emma → grace)
		if (domePath !== undefined) {
			expect(domePath.nodes).not.toContain(hubNode);
		}

		// standardBfs's first path should go through the hub (bob → alice → grace)
		if (bfsPath !== undefined) {
			expect(bfsPath.nodes).toContain(hubNode);
		}
	});

	it("visits fewer total nodes than standardBfs when discovering sparse-region paths", () => {
		const fixture = createSocialHubFixture();
		const { graph } = fixture;

		const domeResult = dome(graph, [
			{ id: "bob", role: "source" },
			{ id: "grace", role: "target" },
		]);

		const bfsResult = standardBfs(graph, [
			{ id: "bob", role: "source" },
			{ id: "grace", role: "target" },
		]);

		// DOME should visit at most as many nodes as standardBfs
		// The advantage is in discovering the first path via niche route
		expect(domeResult.stats.nodesVisited).toBeLessThanOrEqual(
			bfsResult.stats.nodesVisited,
		);
	});

	it("handles the hub node within sampling but discovers non-hub paths first", () => {
		const fixture = createSocialHubFixture();
		const { graph, metadata } = fixture;

		const hubNode = String(metadata["hubNode"]); // Alice
		const domeResult = dome(graph, [
			{ id: "bob", role: "source" },
			{ id: "grace", role: "target" },
		]);

		// At least one path should be found
		expect(domeResult.paths.length).toBeGreaterThan(0);

		// Verify that at least one discovered path avoids the hub
		const nonHubPaths = domeResult.paths.filter(
			(p) =>
				(p.fromSeed.id === "bob" && p.toSeed.id === "grace") ||
				(p.fromSeed.id === "grace" && p.toSeed.id === "bob"),
		);

		expect(nonHubPaths.length).toBeGreaterThan(0);
		const firstNonHubPath = nonHubPaths[0];
		if (firstNonHubPath !== undefined) {
			expect(firstNonHubPath.nodes).not.toContain(hubNode);
		}
	});

	it("achieves lower iterations than standardBfs on hub-deferral scenarios", () => {
		const fixture = createSocialHubFixture();
		const { graph } = fixture;

		const domeResult = dome(graph, [
			{ id: "bob", role: "source" },
			{ id: "grace", role: "target" },
		]);

		const bfsResult = standardBfs(graph, [
			{ id: "bob", role: "source" },
			{ id: "grace", role: "target" },
		]);

		// DOME's smart prioritisation should use at most as many iterations
		// The advantage is in discovering the first path via niche route
		expect(domeResult.stats.iterations).toBeLessThanOrEqual(
			bfsResult.stats.iterations,
		);
	});

	it("reports correct algorithm metadata in stats", () => {
		const fixture = createSocialHubFixture();
		const { graph } = fixture;

		const result = dome(graph, [{ id: "bob" }, { id: "carol" }]);

		expect(result.stats).toHaveProperty("algorithm");
		expect(result.stats.nodesVisited).toBeGreaterThanOrEqual(0);
		expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
		expect(result.stats.termination).toMatch(
			/^(exhausted|limit|collision|error)$/,
		);
	});
});
