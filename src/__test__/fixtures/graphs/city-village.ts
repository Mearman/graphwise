/**
 * City venue network connected to sparse village location network.
 *
 * Structure:
 * - Dense city subgraph (5 venues): high cross-linking (clubs, restaurants, galleries)
 * - Sparse village subgraph (5 places): linear chain (pub → farm → church → school → shop)
 * - Single inter-community edge: city gallery connected to village pub
 *
 * Useful for testing:
 * - Density-aware path scoring
 * - Traversal through sparse regions
 * - SCALE MI variant (density-normalised Jaccard)
 * - Structural contrast in subgraph extraction
 */

import { AdjacencyMapGraph } from "../../../graph";
import type { TestGraphFixture } from "../types";

export function createCityVillageFixture(): TestGraphFixture {
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

	// City internal: nearly complete graph (most pairs connected)
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

	// Village locations: 5 nodes in linear chain
	const villageLocations = ["pub", "farm", "church", "school", "shop"];
	for (const id of villageLocations) {
		graph.addNode({
			id,
			label: id.charAt(0).toUpperCase() + id.slice(1),
			type: "village_place",
		});
	}

	// Village internal: sparse linear chain
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

	// Inter-community: gallery to pub
	graph.addEdge({
		source: "gallery",
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
			description: "Dense city subgraph connected to sparse village chain",
			cityVenues,
			villageLocations,
			cityDensity: 7, // number of city edges
			villageDensity: 4, // number of village edges
			interCommunityEdge: { source: "gallery", target: "pub" },
		},
	};
}
