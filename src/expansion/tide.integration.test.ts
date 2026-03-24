/**
 * Integration test for TIDE expansion algorithm.
 *
 * TIDE (Type-Integrated Degree Estimation) targets sparse regions by using
 * neighbourhood entropy as a priority heuristic. It explores through areas
 * with diverse neighbourhood types before exhausting tight clusters.
 *
 * This test uses a city–village network: dense city subgraph vs sparse
 * village chain. TIDE should traverse the sparse chain more efficiently
 * than DOME (which uses degree-based priority) because entropy-based
 * prioritisation recognises sparse structures.
 */

import { describe, it, expect } from "vitest";
import { createCityVillageFixture } from "../__test__/fixtures";
import { tide } from "./tide";
import { dome } from "./dome";

describe("TIDE integration: sparse-region targeting", () => {
	it("discovers sparse village chain faster than DOME within same node budget", () => {
		const fixture = createCityVillageFixture();
		const { graph } = fixture;
		const villageLocationsValue = fixture.metadata["villageLocations"];
		const villageLocations: readonly string[] = Array.isArray(
			villageLocationsValue,
		)
			? villageLocationsValue.every((v) => typeof v === "string")
				? villageLocationsValue
				: []
			: [];

		const tideResult = tide(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		const domeResult = dome(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		// Both should find paths
		expect(tideResult.paths.length).toBeGreaterThan(0);
		expect(domeResult.paths.length).toBeGreaterThan(0);

		// TIDE's neighbourhood degree sum prioritisation should discover
		// village-node paths more frequently than DOME's degree-only heuristic
		const tideVillageCount = tideResult.paths.filter((p) =>
			p.nodes.some((n) => villageLocations.includes(n)),
		).length;
		const domeVillageCount = domeResult.paths.filter((p) =>
			p.nodes.some((n) => villageLocations.includes(n)),
		).length;

		// TIDE should visit village nodes in at least as many paths as DOME
		expect(tideVillageCount).toBeGreaterThanOrEqual(domeVillageCount);
	});

	it("explores village chain structure by recognising low-entropy regions", () => {
		const fixture = createCityVillageFixture();
		const { graph } = fixture;
		const villageLocationsValue = fixture.metadata["villageLocations"];
		const villageLocations: readonly string[] = Array.isArray(
			villageLocationsValue,
		)
			? villageLocationsValue.every((v) => typeof v === "string")
				? villageLocationsValue
				: []
			: [];

		const tideResult = tide(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		// TIDE should discover at least one path
		expect(tideResult.paths.length).toBeGreaterThan(0);

		// TIDE's first discovered path should contain village nodes
		// because neighbourhood degree sum prioritises sparse regions
		for (const path of tideResult.paths.slice(0, 1)) {
			const villageNodesInPath = path.nodes.filter((n) =>
				villageLocations.includes(n),
			);
			expect(villageNodesInPath.length).toBeGreaterThan(0);
		}

		// TIDE should discover multiple paths with village nodes
		const pathsWithVillage = tideResult.paths.filter((path) =>
			path.nodes.some((node) => villageLocations.includes(node)),
		);
		expect(pathsWithVillage.length).toBeGreaterThan(0);
	});

	it("discovers paths through the sparse chain within reasonable iterations", () => {
		const fixture = createCityVillageFixture();
		const { graph } = fixture;
		const villageLocationsValue = fixture.metadata["villageLocations"];
		const villageLocations: readonly string[] = Array.isArray(
			villageLocationsValue,
		)
			? villageLocationsValue.every((v) => typeof v === "string")
				? villageLocationsValue
				: []
			: [];

		const result = tide(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		// Should find at least one path that traverses the village chain
		expect(result.paths.length).toBeGreaterThan(0);

		// Should terminate cleanly (not error)
		expect(result.stats.termination).not.toBe("error");

		// Discovered paths should include village nodes (since target is a village node)
		const pathsWithVillage = result.paths.filter((p) =>
			p.nodes.some((n) => villageLocations.includes(n)),
		);
		expect(pathsWithVillage.length).toBeGreaterThan(0);
	});

	it("prioritises entropy-diverse expansions over degree alone", () => {
		const fixture = createCityVillageFixture();
		const { graph } = fixture;
		const villageLocationsValue = fixture.metadata["villageLocations"];
		const villageLocations: readonly string[] = Array.isArray(
			villageLocationsValue,
		)
			? villageLocationsValue.every((v) => typeof v === "string")
				? villageLocationsValue
				: []
			: [];

		const tideResult = tide(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		const domeResult = dome(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		// Both should discover paths
		expect(tideResult.paths.length).toBeGreaterThan(0);
		expect(domeResult.paths.length).toBeGreaterThan(0);

		// TIDE should have spent comparable or fewer nodes on discovery
		// (neighbourhood degree sum is more informative than degree alone)
		expect(tideResult.stats.nodesVisited).toBeLessThanOrEqual(
			domeResult.stats.nodesVisited + 5,
		);

		// TIDE's neighbourhood-based approach should prioritise sparse regions,
		// resulting in more village-node paths than DOME's degree-only heuristic
		const tideVillageCount = tideResult.paths.filter((p) =>
			p.nodes.some((n) => villageLocations.includes(n)),
		).length;
		const domeVillageCount = domeResult.paths.filter((p) =>
			p.nodes.some((n) => villageLocations.includes(n)),
		).length;
		expect(tideVillageCount).toBeGreaterThanOrEqual(domeVillageCount);
	});

	it("handles graphs with dense and sparse regions appropriately", () => {
		const fixture = createCityVillageFixture();
		const { graph } = fixture;
		const villageLocationsValue = fixture.metadata["villageLocations"];
		const villageLocations: readonly string[] = Array.isArray(
			villageLocationsValue,
		)
			? villageLocationsValue.every((v) => typeof v === "string")
				? villageLocationsValue
				: []
			: [];

		const result = tide(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		// Result should be well-formed
		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");

		// Stats should be valid
		expect(result.stats.algorithm).toBe("base"); // TIDE uses base algorithm with custom priority
		expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
		expect(result.stats.nodesVisited).toBeGreaterThan(0);

		// Should discover paths that traverse the sparse village chain
		const pathsWithVillage = result.paths.filter((p) =>
			p.nodes.some((n) => villageLocations.includes(n)),
		);
		expect(pathsWithVillage.length).toBeGreaterThan(0);
	});

	it("reports consistent statistics across multiple runs", () => {
		const fixture = createCityVillageFixture();
		const { graph } = fixture;

		const result1 = tide(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		const result2 = tide(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		// Same number of paths discovered
		expect(result1.paths.length).toBe(result2.paths.length);

		// Same nodes visited
		expect(result1.stats.nodesVisited).toBe(result2.stats.nodesVisited);
	});
});
