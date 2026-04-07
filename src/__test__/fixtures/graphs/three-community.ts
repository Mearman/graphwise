/**
 * Three communities (research lab, startup, university) with liaison connectors.
 *
 * Structure:
 * - Research Lab (5 people): highly interconnected (4+ edges each)
 * - Startup (4 people): tightly connected team
 * - University (5 people): academic department
 * - Liaisons: 3 bridge nodes connecting all three communities
 *
 * Useful for testing:
 * - Multi-community path discovery
 * - Liaison node importance
 * - Clustering coefficient effects
 * - SPAN MI variant (clustering-aware edge weighting)
 * - Community detection via exploration
 */

import { AdjacencyMapGraph } from "../../../graph";
import type { TestGraphFixture } from "../types";

export function createThreeCommunityFixture(): TestGraphFixture {
	const graph = AdjacencyMapGraph.undirected();

	// Research Lab (5 people): highly connected
	const lab = ["alice", "bob", "carol", "david", "emma"];
	for (const id of lab) {
		graph.addNode({
			id,
			label: id.charAt(0).toUpperCase() + id.slice(1),
			type: "person",
		});
	}

	// Lab internal: form a clique-like structure
	const labEdges: readonly (readonly [string, string])[] = [
		["alice", "bob"],
		["alice", "carol"],
		["alice", "david"],
		["bob", "carol"],
		["bob", "david"],
		["carol", "david"],
		["carol", "emma"],
		["david", "emma"],
	];

	for (const [source, target] of labEdges) {
		graph.addEdge({
			source,
			target,
			type: "collaborates",
			weight: 1,
		});
	}

	// Startup (4 people): tight team
	const startup = ["frank", "grace", "henry", "iris"];
	for (const id of startup) {
		graph.addNode({
			id,
			label: id.charAt(0).toUpperCase() + id.slice(1),
			type: "person",
		});
	}

	// Startup internal: fully connected (complete subgraph)
	const startupEdges: readonly (readonly [string, string])[] = [
		["frank", "grace"],
		["frank", "henry"],
		["frank", "iris"],
		["grace", "henry"],
		["grace", "iris"],
		["henry", "iris"],
	];

	for (const [source, target] of startupEdges) {
		graph.addEdge({
			source,
			target,
			type: "collaborates",
			weight: 1,
		});
	}

	// University (5 people): academic department
	const university = ["jack", "kate", "liam", "mia", "noah"];
	for (const id of university) {
		graph.addNode({
			id,
			label: id.charAt(0).toUpperCase() + id.slice(1),
			type: "person",
		});
	}

	// University internal: moderate connectivity
	const universityEdges: readonly (readonly [string, string])[] = [
		["jack", "kate"],
		["jack", "liam"],
		["kate", "liam"],
		["liam", "mia"],
		["mia", "noah"],
		["kate", "mia"],
	];

	for (const [source, target] of universityEdges) {
		graph.addEdge({
			source,
			target,
			type: "collaborates",
			weight: 1,
		});
	}

	// Liaisons: 3 bridge nodes connecting communities
	const liaisons = ["liaison1", "liaison2", "liaison3"];
	for (const id of liaisons) {
		graph.addNode({
			id,
			label: id,
			type: "liaison",
		});
	}

	// Liaison connections: each liaison bridges two communities
	// liaison1: lab <-> startup
	graph.addEdge({
		source: "emma",
		target: "liaison1",
		type: "bridge",
		weight: 1,
	});
	graph.addEdge({
		source: "liaison1",
		target: "frank",
		type: "bridge",
		weight: 1,
	});

	// liaison2: startup <-> university
	graph.addEdge({
		source: "iris",
		target: "liaison2",
		type: "bridge",
		weight: 1,
	});
	graph.addEdge({
		source: "liaison2",
		target: "jack",
		type: "bridge",
		weight: 1,
	});

	// liaison3: university <-> lab
	graph.addEdge({
		source: "noah",
		target: "liaison3",
		type: "bridge",
		weight: 1,
	});
	graph.addEdge({
		source: "liaison3",
		target: "alice",
		type: "bridge",
		weight: 1,
	});

	return {
		graph,
		seeds: [
			{ id: "bob", role: "source" },
			{ id: "mia", role: "target" },
		],
		metadata: {
			description:
				"Three dense communities (lab, startup, university) connected by liaison bridge nodes",
			communities: {
				lab,
				startup,
				university,
			},
			liaisons,
			labCliqueness: 8, // number of edges
			startupCliqueness: 6, // complete subgraph
			universityCliqueness: 6,
		},
	};
}
