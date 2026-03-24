/**
 * Social network with hub: Alice is highly connected, others form niche communities.
 *
 * Structure:
 * - Alice (hub, degree 10+): central connector
 * - 10 other people: each knows Alice + forms small local clusters
 * - Bob and Carol: connected via niche interest (narrow path through shared friend)
 *
 * Useful for testing:
 * - Hub deferral in expansion (DOME should explore low-degree edges first)
 * - Path discovery through sparse interest communities
 * - Degree-based heuristics
 */

import { AdjacencyMapGraph } from "../../../graph";
import type { TestGraphFixture } from "../types";

export function createSocialHubFixture(): TestGraphFixture {
	const graph = AdjacencyMapGraph.undirected();

	// Alice: the hub
	graph.addNode({
		id: "alice",
		label: "Alice",
		type: "person",
	});

	// 10 other people
	const people = [
		"bob",
		"carol",
		"david",
		"emma",
		"frank",
		"grace",
		"henry",
		"iris",
		"jack",
		"kate",
	];

	for (const id of people) {
		graph.addNode({
			id,
			label: id.charAt(0).toUpperCase() + id.slice(1),
			type: "person",
		});
	}

	// Alice knows everyone (degree 10)
	for (const id of people) {
		graph.addEdge({
			source: "alice",
			target: id,
			type: "knows",
			weight: 1,
		});
	}

	// Local clusters: small groups forming niche interests
	// Photography club: Bob, Carol, David
	graph.addEdge({ source: "bob", target: "carol", type: "knows", weight: 1 });
	graph.addEdge({ source: "carol", target: "david", type: "knows", weight: 1 });
	graph.addEdge({ source: "david", target: "bob", type: "knows", weight: 1 });

	// Hiking group: Emma, Frank, Grace
	graph.addEdge({ source: "emma", target: "frank", type: "knows", weight: 1 });
	graph.addEdge({ source: "frank", target: "grace", type: "knows", weight: 1 });
	graph.addEdge({ source: "grace", target: "emma", type: "knows", weight: 1 });

	// Cooking group: Henry, Iris, Jack
	graph.addEdge({ source: "henry", target: "iris", type: "knows", weight: 1 });
	graph.addEdge({ source: "iris", target: "jack", type: "knows", weight: 1 });
	graph.addEdge({ source: "jack", target: "henry", type: "knows", weight: 1 });

	// Kate isolated (only knows Alice)

	// Cross-cluster connection: Carol (photography) <-> Emma (hiking)
	// This creates a bridge between two otherwise separate communities
	graph.addEdge({
		source: "carol",
		target: "emma",
		type: "knows",
		weight: 1,
	});

	return {
		graph,
		seeds: [
			{ id: "bob", role: "source" },
			{ id: "kate", role: "target" },
		],
		metadata: {
			description:
				"Social network with hub (Alice, degree 10+) and niche interest clusters",
			hubNode: "alice",
			clusters: {
				photography: ["bob", "carol", "david"],
				hiking: ["emma", "frank", "grace"],
				cooking: ["henry", "iris", "jack"],
			},
			isolated: ["kate"],
		},
	};
}
