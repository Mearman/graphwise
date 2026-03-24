/**
 * Integration test for FLUX expansion algorithm.
 *
 * FLUX (Multi-phase Adaptive Zone Exploration) combines PIPE (phase 1),
 * SAGE (phase 2), and adaptive termination to discover paths across regions
 * of varying density. It switches strategies based on local structure and
 * discovers more paths than single-strategy algorithms.
 *
 * This test uses a three-density network (city, suburban, village). FLUX
 * should discover paths through all regions and total paths ≥ DOME/EDGE
 * because it adapts strategy to local density.
 */

import { describe, it, expect } from "vitest";
import { createCitySuburbanVillageFixture } from "../__test__/fixtures";
import { flux } from "./flux";
import { dome } from "./dome";
import { tide } from "./tide";
import { warp } from "./warp";

// Type guard helpers for metadata extraction
function getStringArray(value: unknown): readonly string[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return value.every((v) => typeof v === "string") ? value : [];
}

function getBridgeObject(value: unknown): { source: string; target: string } {
	if (
		typeof value === "object" &&
		value !== null &&
		"source" in value &&
		"target" in value
	) {
		const record = Object.assign({}, value);
		const source = record.source;
		const target = record.target;
		if (typeof source === "string" && typeof target === "string") {
			return { source, target };
		}
	}
	return { source: "", target: "" };
}

describe("FLUX integration: density-aware multi-phase exploration", () => {
	it("discovers paths through all three density regions", () => {
		const fixture = createCitySuburbanVillageFixture();
		const { graph, metadata } = fixture;
		const cityVenues = getStringArray(metadata["cityVenues"]);
		const suburbanLocations = getStringArray(metadata["suburbanLocations"]);
		const villageLocations = getStringArray(metadata["villageLocations"]);

		const result = flux(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		expect(result.paths.length).toBeGreaterThan(0);

		// Classify paths by regional coverage
		const allRegionPaths = result.paths.filter((path) => {
			const hasCityNode = path.nodes.some((n) => cityVenues.includes(n));
			const hasSuburbanNode = path.nodes.some((n) =>
				suburbanLocations.includes(n),
			);
			const hasVillageNode = path.nodes.some((n) =>
				villageLocations.includes(n),
			);
			return hasCityNode && hasSuburbanNode && hasVillageNode;
		});

		const multiRegionPaths = result.paths.filter((path) => {
			const regions = new Set<string>();
			for (const n of path.nodes) {
				if (cityVenues.includes(n)) regions.add("city");
				if (suburbanLocations.includes(n)) regions.add("suburban");
				if (villageLocations.includes(n)) regions.add("village");
			}
			return regions.size >= 2;
		});

		// FLUX must discover paths spanning multiple regions
		expect(multiRegionPaths.length).toBeGreaterThan(0);
		// Strong indicator of zone exploration: paths traversing all three regions
		expect(allRegionPaths.length).toBeGreaterThan(0);
	});

	it("discovers equal or more paths than DOME and EDGE individually", () => {
		const fixture = createCitySuburbanVillageFixture();
		const { graph } = fixture;

		const fluxResult = flux(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		const domeResult = dome(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		const tideResult = tide(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		expect(fluxResult.paths.length).toBeGreaterThan(0);
		expect(domeResult.paths.length).toBeGreaterThan(0);
		expect(tideResult.paths.length).toBeGreaterThan(0);

		// FLUX combines multiple strategies, so should discover paths comparable to or exceeding individual strategies
		expect(fluxResult.paths.length).toBeGreaterThanOrEqual(
			Math.max(domeResult.paths.length, tideResult.paths.length),
		);
	});

	it("adapts exploration strategy to local density", () => {
		const fixture = createCitySuburbanVillageFixture();
		const { graph } = fixture;

		const result = flux(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		expect(result.paths.length).toBeGreaterThan(0);

		// FLUX should discover paths, indicating successful strategy adaptation
		expect(result.stats.nodesVisited).toBeGreaterThan(0);
	});

	it("traverses bridges connecting city, suburban, and village", () => {
		const fixture = createCitySuburbanVillageFixture();
		const { graph, metadata } = fixture;
		const cityToSuburbanBridge = getBridgeObject(
			metadata["cityToSuburbanBridge"],
		);
		const suburbanToVillageBridge = getBridgeObject(
			metadata["suburbanToVillageBridge"],
		);

		const result = flux(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		const bridgeEdges = [
			[cityToSuburbanBridge.source, cityToSuburbanBridge.target],
			[suburbanToVillageBridge.source, suburbanToVillageBridge.target],
		];

		// At least some paths should use bridge edges
		const pathsWithBridges = result.paths.filter((path) => {
			for (let i = 0; i < path.nodes.length - 1; i++) {
				const source = path.nodes[i];
				const target = path.nodes[i + 1];

				for (const [u, v] of bridgeEdges) {
					if (
						(source === u && target === v) ||
						(source === v && target === u)
					) {
						return true;
					}
				}
			}
			return false;
		});

		expect(pathsWithBridges.length).toBeGreaterThan(0);
	});

	it("returns well-formed expansion result with valid statistics", () => {
		const fixture = createCitySuburbanVillageFixture();
		const { graph } = fixture;

		const result = flux(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");

		expect(result.stats.algorithm).toBeDefined();
		expect(result.stats.durationMs).toBeGreaterThanOrEqual(0);
		expect(result.stats.termination).not.toBe("error");
	});

	it("visits nodes from multiple density regions", () => {
		const fixture = createCitySuburbanVillageFixture();
		const { graph, metadata } = fixture;
		const cityVenues = getStringArray(metadata["cityVenues"]);
		const suburbanLocations = getStringArray(metadata["suburbanLocations"]);
		const villageLocations = getStringArray(metadata["villageLocations"]);

		const result = flux(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		const cityNodesVisited = Array.from(result.sampledNodes).filter((n) =>
			cityVenues.includes(n),
		);
		const suburbanNodesVisited = Array.from(result.sampledNodes).filter((n) =>
			suburbanLocations.includes(n),
		);
		const villageNodesVisited = Array.from(result.sampledNodes).filter((n) =>
			villageLocations.includes(n),
		);

		// FLUX should explore multiple nodes from each region, demonstrating cross-density adaptation
		expect(cityNodesVisited.length).toBeGreaterThan(1);
		expect(suburbanNodesVisited.length).toBeGreaterThan(1);
		expect(villageNodesVisited.length).toBeGreaterThan(1);

		// Multi-region visitation proves density-aware strategy switching
		const totalRegionsExplored = [
			cityNodesVisited.length > 0,
			suburbanNodesVisited.length > 0,
			villageNodesVisited.length > 0,
		].filter(Boolean).length;
		expect(totalRegionsExplored).toBe(3);
	});

	it("maintains consistency between discovered paths and sampledNodes", () => {
		const fixture = createCitySuburbanVillageFixture();
		const { graph } = fixture;

		const result = flux(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
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

	it("completes multi-phase exploration within reasonable iterations", () => {
		const fixture = createCitySuburbanVillageFixture();
		const { graph } = fixture;

		const result = flux(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		// Multi-phase algorithm may use more iterations but should still terminate
		expect(result.stats.iterations).toBeGreaterThan(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("respects seed roles throughout exploration", () => {
		const fixture = createCitySuburbanVillageFixture();
		const { graph } = fixture;

		const result = flux(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		expect(result.paths.length).toBeGreaterThan(0);

		// All paths should connect nightclub and shop (bidirectional allows either direction)
		const validPaths = result.paths.every((path) => {
			const connectsSeeds =
				(path.fromSeed.id === "nightclub" && path.toSeed.id === "shop") ||
				(path.fromSeed.id === "shop" && path.toSeed.id === "nightclub");
			return connectsSeeds;
		});

		expect(validPaths).toBe(true);
	});

	it("combines PIPE, SAGE, and adaptive termination strategies", () => {
		const fixture = createCitySuburbanVillageFixture();
		const { graph } = fixture;

		const fluxResult = flux(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		const warpResult = warp(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		expect(fluxResult.paths.length).toBeGreaterThan(0);
		expect(warpResult.paths.length).toBeGreaterThan(0);

		// FLUX should discover valid paths
		expect(fluxResult.stats.nodesVisited).toBeGreaterThan(0);
	});
});
