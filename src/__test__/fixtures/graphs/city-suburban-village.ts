/**
 * Three-density region network: dense city, medium-density suburban, sparse village.
 *
 * Structure:
 * - Dense city (5 venues): nearly complete subgraph (7 edges, density ≈ 0.7)
 * - Medium-density suburban (4 locations): moderate interconnectivity (4 edges, density ≈ 0.67)
 * - Sparse village (5 places): linear chain (4 edges, density ≈ 0.2)
 * - Bridges: city–suburban edge + suburban–village edge
 *
 * Useful for testing:
 * - Density-aware switching between exploration strategies
 * - MAZE algorithm's three-phase density recognition
 * - Traversal through regions with varying local structure
 * - SCALE MI variant (density-normalised Jaccard)
 */

import { AdjacencyMapGraph } from "../../../graph";
import type { TestGraphFixture } from "../types";

export function createCitySuburbanVillageFixture(): TestGraphFixture {
	const graph = AdjacencyMapGraph.undirected();

	// City venues: 5 nodes with dense cross-linking
	const cityVenues = ["nightclub", "restaurant", "cafe", "gallery", "museum"];
	for (const id of cityVenues) {
		graph.addNode({
			id,
			label: id.charAt(0).toUpperCase() + id.slice(1),
			type: "city_venue",
		});
	}

	// City internal: dense cross-linking (7 edges)
	const cityPairs: readonly (readonly [string, string])[] = [
		["nightclub", "restaurant"],
		["nightclub", "cafe"],
		["nightclub", "gallery"],
		["restaurant", "cafe"],
		["restaurant", "museum"],
		["cafe", "gallery"],
		["gallery", "museum"],
	];

	for (const [source, target] of cityPairs) {
		graph.addEdge({
			source,
			target,
			type: "connected",
			weight: 1,
		});
	}

	// Suburban locations: 4 nodes with moderate interconnectivity
	const suburbanLocations = ["mall", "park", "library", "station"];
	for (const id of suburbanLocations) {
		graph.addNode({
			id,
			label: id.charAt(0).toUpperCase() + id.slice(1),
			type: "suburban_location",
		});
	}

	// Suburban internal: moderate connectivity (4 edges, forming a path-like structure)
	const suburbanPairs: readonly (readonly [string, string])[] = [
		["mall", "park"],
		["park", "library"],
		["library", "station"],
		["station", "mall"], // Closes a ring
	];

	for (const [source, target] of suburbanPairs) {
		graph.addEdge({
			source,
			target,
			type: "connected",
			weight: 1,
		});
	}

	// Village locations: 5 nodes in sparse linear chain
	const villageLocations = ["pub", "farm", "church", "school", "shop"];
	for (const id of villageLocations) {
		graph.addNode({
			id,
			label: id.charAt(0).toUpperCase() + id.slice(1),
			type: "village_place",
		});
	}

	// Village internal: sparse linear chain (4 edges)
	const villageChain: readonly (readonly [string, string])[] = [
		["pub", "farm"],
		["farm", "church"],
		["church", "school"],
		["school", "shop"],
	];

	for (const [source, target] of villageChain) {
		graph.addEdge({
			source,
			target,
			type: "connected",
			weight: 1,
		});
	}

	// City-to-suburban bridge: gallery (city) to mall (suburban)
	graph.addEdge({
		source: "gallery",
		target: "mall",
		type: "connected",
		weight: 1,
	});

	// Suburban-to-village bridge: station (suburban) to pub (village)
	graph.addEdge({
		source: "station",
		target: "pub",
		type: "connected",
		weight: 1,
	});

	return {
		graph,
		seeds: [
			{ id: "nightclub", role: "source" },
			{ id: "shop", role: "target" },
		],
		metadata: {
			description:
				"Three-density network: dense city, medium suburban, sparse village",
			cityVenues,
			suburbanLocations,
			villageLocations,
			cityDensity: 7,
			suburbanDensity: 4,
			villageDensity: 4,
			cityEdges: cityPairs,
			suburbanEdges: suburbanPairs,
			villageEdges: villageChain,
			cityToSuburbanBridge: { source: "gallery", target: "mall" },
			suburbanToVillageBridge: { source: "station", target: "pub" },
		},
	};
}
