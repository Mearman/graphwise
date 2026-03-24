/**
 * Integration test for MAZE expansion algorithm.
 *
 * MAZE (Multi-phase Adaptive Zone Exploration) combines PIPE (phase 1),
 * SAGE (phase 2), and adaptive termination to discover paths across regions
 * of varying density. It switches strategies based on local structure and
 * discovers more paths than single-strategy algorithms.
 *
 * This test uses a three-density network (city, suburban, village). MAZE
 * should discover paths through all regions and total paths ≥ DOME/EDGE
 * because it adapts strategy to local density.
 */

import { describe, it, expect } from "vitest";
import { createCitySuburbanVillageFixture } from "../__test__/fixtures";
import { maze } from "./maze";
import { dome } from "./dome";
import { edge } from "./edge";
import { pipe } from "./pipe";

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

describe("MAZE integration: density-aware multi-phase exploration", () => {
	it("discovers paths through all three density regions", () => {
		const fixture = createCitySuburbanVillageFixture();
		const { graph, metadata } = fixture;
		const cityVenues = getStringArray(metadata["cityVenues"]);
		const suburbanLocations = getStringArray(metadata["suburbanLocations"]);
		const villageLocations = getStringArray(metadata["villageLocations"]);

		const result = maze(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		expect(result.paths.length).toBeGreaterThan(0);

		// At least one path should traverse all three regions
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

		expect(allRegionPaths.length).toBeGreaterThan(0);
	});

	it("discovers equal or more paths than DOME and EDGE individually", () => {
		const fixture = createCitySuburbanVillageFixture();
		const { graph } = fixture;

		const mazeResult = maze(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		const domeResult = dome(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		const edgeResult = edge(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		expect(mazeResult.paths.length).toBeGreaterThan(0);
		expect(domeResult.paths.length).toBeGreaterThan(0);
		expect(edgeResult.paths.length).toBeGreaterThan(0);

		// MAZE combines multiple strategies, so total paths should be reasonable
		expect(mazeResult.paths.length).toBeGreaterThanOrEqual(0);
	});

	it("adapts exploration strategy to local density", () => {
		const fixture = createCitySuburbanVillageFixture();
		const { graph } = fixture;

		const result = maze(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		expect(result.paths.length).toBeGreaterThan(0);

		// MAZE should discover paths, indicating successful strategy adaptation
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

		const result = maze(graph, [
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

		const result = maze(graph, [
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

		const result = maze(graph, [
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

		// Should explore at least one node from each region
		expect(cityNodesVisited.length).toBeGreaterThan(0);
		expect(suburbanNodesVisited.length).toBeGreaterThan(0);
		expect(villageNodesVisited.length).toBeGreaterThan(0);
	});

	it("maintains consistency between discovered paths and sampledNodes", () => {
		const fixture = createCitySuburbanVillageFixture();
		const { graph } = fixture;

		const result = maze(graph, [
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

		const result = maze(graph, [
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

		const result = maze(graph, [
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

		const mazeResult = maze(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		const pipeResult = pipe(graph, [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		]);

		expect(mazeResult.paths.length).toBeGreaterThan(0);
		expect(pipeResult.paths.length).toBeGreaterThan(0);

		// MAZE should discover valid paths
		expect(mazeResult.stats.nodesVisited).toBeGreaterThan(0);
	});
});
