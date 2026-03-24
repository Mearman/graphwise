/**
 * Typed entity graph with people and organisations, various relationship types.
 *
 * Structure:
 * - 12 people: a, b, c, d, e, f, g, h, i, j, k, l
 * - 3 organisations: org1, org2, org3
 * - 10 "knows" edges: people-to-people social relationships
 * - 2 "mentors" edges: people-to-people professional relationships
 * - 6 "works_at" edges: people-to-organisation employment
 *
 * Useful for testing:
 * - Edge-type contrast heuristics (ETCH)
 * - Node-type aware path discovery
 * - Type-specific filtering and constraints
 * - Mixed relationship type traversal
 */

import { AdjacencyMapGraph } from "../../../graph";
import type { TestGraphFixture } from "../types";

export function createTypedEntityFixture(): TestGraphFixture {
	const graph = AdjacencyMapGraph.directed();

	// Add 12 people
	const people = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"];
	for (const id of people) {
		graph.addNode({
			id,
			label: `Person ${id.toUpperCase()}`,
			type: "person",
		});
	}

	// Add 3 organisations
	const orgs = ["org1", "org2", "org3"];
	for (const id of orgs) {
		graph.addNode({
			id,
			label: id,
			type: "organisation",
		});
	}

	// People social connections ("knows" edges): 10 edges
	const knowsEdges: readonly (readonly [string, string])[] = [
		["a", "b"],
		["b", "c"],
		["c", "d"],
		["d", "e"],
		["e", "f"],
		["f", "g"],
		["g", "h"],
		["h", "i"],
		["i", "j"],
		["j", "k"],
	];

	for (const [source, target] of knowsEdges) {
		graph.addEdge({
			source,
			target,
			type: "knows",
			weight: 1,
		});
	}

	// Professional mentoring ("mentors" edges): 2 edges (rarer relationship type)
	graph.addEdge({
		source: "k",
		target: "l",
		type: "mentors",
		weight: 1,
	});
	graph.addEdge({
		source: "f",
		target: "a",
		type: "mentors",
		weight: 1,
	});

	// Employment relationships ("works_at"): 6 people with organisations
	const employmentEdges: readonly (readonly [string, string])[] = [
		["a", "org1"],
		["b", "org1"],
		["c", "org2"],
		["d", "org2"],
		["e", "org3"],
		["f", "org3"],
	];

	for (const [person, org] of employmentEdges) {
		graph.addEdge({
			source: person,
			target: org,
			type: "works_at",
			weight: 1,
		});
	}

	return {
		graph,
		seeds: [
			{ id: "a", role: "source" },
			{ id: "l", role: "target" },
		],
		metadata: {
			description:
				"Mixed entity graph with typed nodes (person/organisation) and edges (knows/mentors/works_at)",
			people,
			organisations: orgs,
			edgeTypes: {
				knows: knowsEdges.length,
				mentors: 2,
				works_at: 6,
			},
			nodeTypes: {
				person: people.length,
				organisation: orgs.length,
			},
		},
	};
}
