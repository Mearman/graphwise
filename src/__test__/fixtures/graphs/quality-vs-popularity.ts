/**
 * Two paths: one via popular shallow connector (high degree, low MI),
 * another via specialist chain (low degree, high MI).
 *
 * Structure:
 * - Path A: Source → FamousConnector (hub, degree 6) → Target (high degree, but low MI)
 * - Path B: Source → Specialist1 → Specialist2 → Target (low degree, high MI)
 *
 * Useful for testing:
 * - PARSE path ranking (should prefer high-MI over high-degree paths)
 * - Degree-based priority vs MI-based ranking contrast
 * - Hub deferral effectiveness
 * - ETCH/NOTCH (degree/type rarity) MI variants
 */

import { AdjacencyMapGraph } from "../../../graph";
import type { TestGraphFixture } from "../types";

export function createQualityVsPopularityFixture(): TestGraphFixture {
	const graph = AdjacencyMapGraph.undirected();

	// Add nodes
	const nodes = [
		"source",
		"fame_connector",
		"specialist1",
		"specialist2",
		"target",
		"hub_leaf1",
		"hub_leaf2",
		"hub_leaf3",
		"hub_leaf4",
	];

	for (const id of nodes) {
		const label = id
			.split("_")
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(" ");
		graph.addNode({
			id,
			label,
			type: "person",
		});
	}

	// Path A: Source → FamousConnector (hub with 6+ connections) → Target
	// The FamousConnector has low MI with neighbours (many unrelated connections)
	graph.addEdge({
		source: "source",
		target: "fame_connector",
		type: "knows",
		weight: 1,
	});
	graph.addEdge({
		source: "fame_connector",
		target: "target",
		type: "knows",
		weight: 1,
	});

	// FamousConnector's other connections (hub leaves)
	for (let i = 1; i <= 4; i += 1) {
		const target = `hub_leaf${String(i)}`;
		graph.addEdge({
			source: "fame_connector",
			target,
			type: "knows",
			weight: 1,
		});
	}

	// Path B: Source → Specialist1 → Specialist2 → Target
	// Specialists have few connections but high mutual information
	// (their few neighbours share common interests)
	graph.addEdge({
		source: "source",
		target: "specialist1",
		type: "knows",
		weight: 1,
	});
	graph.addEdge({
		source: "specialist1",
		target: "specialist2",
		type: "knows",
		weight: 1,
	});
	graph.addEdge({
		source: "specialist2",
		target: "target",
		type: "knows",
		weight: 1,
	});

	// Create local clusters around specialists to increase MI
	// Specialist1 cluster: specialist1, sp1_peer1, sp1_peer2
	graph.addNode({
		id: "sp1_peer1",
		label: "Specialist1 Peer1",
		type: "person",
	});
	graph.addNode({
		id: "sp1_peer2",
		label: "Specialist1 Peer2",
		type: "person",
	});

	graph.addEdge({
		source: "specialist1",
		target: "sp1_peer1",
		type: "knows",
		weight: 1,
	});
	graph.addEdge({
		source: "specialist1",
		target: "sp1_peer2",
		type: "knows",
		weight: 1,
	});
	graph.addEdge({
		source: "sp1_peer1",
		target: "sp1_peer2",
		type: "knows",
		weight: 1,
	});
	graph.addEdge({
		source: "sp1_peer1",
		target: "specialist2",
		type: "knows",
		weight: 1,
	});

	// Specialist2 cluster: specialist2, sp2_peer1, sp2_peer2
	graph.addNode({
		id: "sp2_peer1",
		label: "Specialist2 Peer1",
		type: "person",
	});
	graph.addNode({
		id: "sp2_peer2",
		label: "Specialist2 Peer2",
		type: "person",
	});

	graph.addEdge({
		source: "specialist2",
		target: "sp2_peer1",
		type: "knows",
		weight: 1,
	});
	graph.addEdge({
		source: "specialist2",
		target: "sp2_peer2",
		type: "knows",
		weight: 1,
	});
	graph.addEdge({
		source: "sp2_peer1",
		target: "sp2_peer2",
		type: "knows",
		weight: 1,
	});
	graph.addEdge({
		source: "sp2_peer1",
		target: "target",
		type: "knows",
		weight: 1,
	});

	return {
		graph,
		seeds: [
			{ id: "source", role: "source" },
			{ id: "target", role: "target" },
		],
		metadata: {
			description:
				"Contrasts high-popularity low-MI path vs low-popularity high-MI path",
			pathA: {
				name: "Famous Connector Path",
				nodes: ["source", "fame_connector", "target"],
				length: 2,
				characterisation: "high degree, low MI, shallow",
			},
			pathB: {
				name: "Specialist Chain Path",
				nodes: ["source", "specialist1", "specialist2", "target"],
				length: 3,
				characterisation: "low degree, high MI, longer but tight clusters",
			},
			pathAConnectorDegree: 6, // source + target + 4 leaves
			pathBSpecialistDegree: 3, // each specialist degree ~3
		},
	};
}
