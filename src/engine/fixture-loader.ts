import { AdjacencyMapGraph } from "graphwise/graph";
import type { Seed } from "graphwise/expansion";

export interface DemoFixture {
	readonly name: string;
	readonly description: string;
	readonly directed: boolean;
	readonly graph: AdjacencyMapGraph;
	readonly seeds: readonly Seed[];
}

export type FixtureName =
	| "linear-chain"
	| "social-hub"
	| "two-department"
	| "city-village"
	| "city-suburban-village"
	| "three-community"
	| "typed-entity"
	| "quality-vs-popularity";

/** Create linear chain: A–B–C–D–E */
function createLinearChain(): DemoFixture {
	const graph = AdjacencyMapGraph.undirected();
	const nodes = ["A", "B", "C", "D", "E"];

	for (const id of nodes) {
		graph.addNode({ id, label: `Node ${id}`, type: "node" });
	}

	for (let i = 0; i < nodes.length - 1; i++) {
		const source = nodes[i];
		const target = nodes[i + 1];
		if (source !== undefined && target !== undefined) {
			graph.addEdge({ source, target, type: "connected", weight: 1 });
		}
	}

	return {
		name: "linear-chain",
		description: "Simple linear chain: A–B–C–D–E",
		directed: false,
		graph,
		seeds: [
			{ id: "A", role: "bidirectional" },
			{ id: "E", role: "bidirectional" },
		],
	};
}

/** Create social hub with Alice as central connector */
function createSocialHub(): DemoFixture {
	const graph = AdjacencyMapGraph.undirected();

	// Alice: the hub
	graph.addNode({ id: "alice", label: "Alice", type: "person" });

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

	// Alice knows everyone
	for (const id of people) {
		graph.addEdge({ source: "alice", target: id, type: "knows", weight: 1 });
	}

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

	// Cross-cluster: Carol <-> Emma
	graph.addEdge({ source: "carol", target: "emma", type: "knows", weight: 1 });

	return {
		name: "social-hub",
		description:
			"Social network with hub (Alice, degree 10) and niche interest clusters",
		directed: false,
		graph,
		seeds: [
			{ id: "bob", role: "bidirectional" },
			{ id: "kate", role: "bidirectional" },
		],
	};
}

/** Create two-department organisational structure */
function createTwoDepartment(): DemoFixture {
	const graph = AdjacencyMapGraph.undirected();

	// Marketing department
	const marketing = ["alice", "bob", "carol", "david", "emma"];
	for (const id of marketing) {
		graph.addNode({
			id,
			label: id.charAt(0).toUpperCase() + id.slice(1),
			type: "employee",
		});
	}

	// Engineering department
	const engineering = ["frank", "grace", "henry", "iris", "jack"];
	for (const id of engineering) {
		graph.addNode({
			id,
			label: id.charAt(0).toUpperCase() + id.slice(1),
			type: "employee",
		});
	}

	// Marketing internal
	graph.addEdge({ source: "alice", target: "bob", type: "knows", weight: 1 });
	graph.addEdge({ source: "alice", target: "carol", type: "knows", weight: 1 });
	graph.addEdge({ source: "alice", target: "david", type: "knows", weight: 1 });
	graph.addEdge({ source: "bob", target: "carol", type: "knows", weight: 1 });
	graph.addEdge({ source: "bob", target: "david", type: "knows", weight: 1 });
	graph.addEdge({ source: "bob", target: "emma", type: "knows", weight: 1 });
	graph.addEdge({ source: "carol", target: "david", type: "knows", weight: 1 });
	graph.addEdge({ source: "carol", target: "emma", type: "knows", weight: 1 });
	graph.addEdge({ source: "david", target: "emma", type: "knows", weight: 1 });

	// Engineering internal
	graph.addEdge({ source: "frank", target: "grace", type: "knows", weight: 1 });
	graph.addEdge({ source: "frank", target: "henry", type: "knows", weight: 1 });
	graph.addEdge({ source: "grace", target: "henry", type: "knows", weight: 1 });
	graph.addEdge({ source: "grace", target: "iris", type: "knows", weight: 1 });
	graph.addEdge({ source: "henry", target: "iris", type: "knows", weight: 1 });
	graph.addEdge({ source: "iris", target: "jack", type: "knows", weight: 1 });
	graph.addEdge({ source: "henry", target: "jack", type: "knows", weight: 1 });

	// Cross-department bridges
	graph.addEdge({
		source: "carol",
		target: "frank",
		type: "collaborated",
		weight: 1,
	});
	graph.addEdge({
		source: "emma",
		target: "frank",
		type: "collaborated",
		weight: 1,
	});
	graph.addEdge({
		source: "carol",
		target: "grace",
		type: "collaborated",
		weight: 1,
	});

	return {
		name: "two-department",
		description:
			"Two dense departmental clusters with cross-department bridges",
		directed: false,
		graph,
		seeds: [
			{ id: "alice", role: "bidirectional" },
			{ id: "jack", role: "bidirectional" },
		],
	};
}

/** Create city–village density contrast */
function createCityVillage(): DemoFixture {
	const graph = AdjacencyMapGraph.undirected();

	// City venues
	const cityVenues = ["nightclub", "restaurant", "cafe", "gallery", "museum"];
	for (const id of cityVenues) {
		graph.addNode({
			id,
			label: id.charAt(0).toUpperCase() + id.slice(1),
			type: "city_venue",
		});
	}

	// City internal: dense
	graph.addEdge({
		source: "nightclub",
		target: "restaurant",
		type: "connected",
		weight: 1,
	});
	graph.addEdge({
		source: "nightclub",
		target: "cafe",
		type: "connected",
		weight: 1,
	});
	graph.addEdge({
		source: "nightclub",
		target: "gallery",
		type: "connected",
		weight: 1,
	});
	graph.addEdge({
		source: "restaurant",
		target: "cafe",
		type: "connected",
		weight: 1,
	});
	graph.addEdge({
		source: "restaurant",
		target: "museum",
		type: "connected",
		weight: 1,
	});
	graph.addEdge({
		source: "cafe",
		target: "gallery",
		type: "connected",
		weight: 1,
	});
	graph.addEdge({
		source: "gallery",
		target: "museum",
		type: "connected",
		weight: 1,
	});

	// Village locations
	const villageLocations = ["pub", "farm", "church", "school", "shop"];
	for (const id of villageLocations) {
		graph.addNode({
			id,
			label: id.charAt(0).toUpperCase() + id.slice(1),
			type: "village_place",
		});
	}

	// Village internal: sparse chain
	graph.addEdge({
		source: "pub",
		target: "farm",
		type: "connected",
		weight: 1,
	});
	graph.addEdge({
		source: "farm",
		target: "church",
		type: "connected",
		weight: 1,
	});
	graph.addEdge({
		source: "church",
		target: "school",
		type: "connected",
		weight: 1,
	});
	graph.addEdge({
		source: "school",
		target: "shop",
		type: "connected",
		weight: 1,
	});

	// Inter-community bridge
	graph.addEdge({
		source: "gallery",
		target: "pub",
		type: "connected",
		weight: 1,
	});

	return {
		name: "city-village",
		description: "Dense city subgraph connected to sparse village chain",
		directed: false,
		graph,
		seeds: [
			{ id: "nightclub", role: "bidirectional" },
			{ id: "shop", role: "bidirectional" },
		],
	};
}

/** Create city–suburban–village three-density */
function createCitySuburbanVillage(): DemoFixture {
	const graph = AdjacencyMapGraph.undirected();

	// City venues
	const cityVenues = ["nightclub", "restaurant", "cafe", "gallery", "museum"];
	for (const id of cityVenues) {
		graph.addNode({
			id,
			label: id.charAt(0).toUpperCase() + id.slice(1),
			type: "city_venue",
		});
	}

	graph.addEdge({
		source: "nightclub",
		target: "restaurant",
		type: "connected",
		weight: 1,
	});
	graph.addEdge({
		source: "nightclub",
		target: "cafe",
		type: "connected",
		weight: 1,
	});
	graph.addEdge({
		source: "nightclub",
		target: "gallery",
		type: "connected",
		weight: 1,
	});
	graph.addEdge({
		source: "restaurant",
		target: "cafe",
		type: "connected",
		weight: 1,
	});
	graph.addEdge({
		source: "restaurant",
		target: "museum",
		type: "connected",
		weight: 1,
	});
	graph.addEdge({
		source: "cafe",
		target: "gallery",
		type: "connected",
		weight: 1,
	});
	graph.addEdge({
		source: "gallery",
		target: "museum",
		type: "connected",
		weight: 1,
	});

	// Suburban locations
	const suburbanLocations = ["mall", "park", "library", "station"];
	for (const id of suburbanLocations) {
		graph.addNode({
			id,
			label: id.charAt(0).toUpperCase() + id.slice(1),
			type: "suburban_location",
		});
	}

	graph.addEdge({
		source: "mall",
		target: "park",
		type: "connected",
		weight: 1,
	});
	graph.addEdge({
		source: "park",
		target: "library",
		type: "connected",
		weight: 1,
	});
	graph.addEdge({
		source: "library",
		target: "station",
		type: "connected",
		weight: 1,
	});
	graph.addEdge({
		source: "station",
		target: "mall",
		type: "connected",
		weight: 1,
	});

	// Village locations
	const villageLocations = ["pub", "farm", "church", "school", "shop"];
	for (const id of villageLocations) {
		graph.addNode({
			id,
			label: id.charAt(0).toUpperCase() + id.slice(1),
			type: "village_place",
		});
	}

	graph.addEdge({
		source: "pub",
		target: "farm",
		type: "connected",
		weight: 1,
	});
	graph.addEdge({
		source: "farm",
		target: "church",
		type: "connected",
		weight: 1,
	});
	graph.addEdge({
		source: "church",
		target: "school",
		type: "connected",
		weight: 1,
	});
	graph.addEdge({
		source: "school",
		target: "shop",
		type: "connected",
		weight: 1,
	});

	// Bridges
	graph.addEdge({
		source: "gallery",
		target: "mall",
		type: "connected",
		weight: 1,
	});
	graph.addEdge({
		source: "station",
		target: "pub",
		type: "connected",
		weight: 1,
	});

	return {
		name: "city-suburban-village",
		description:
			"Three-density network: dense city, medium suburban, sparse village",
		directed: false,
		graph,
		seeds: [
			{ id: "nightclub", role: "bidirectional" },
			{ id: "shop", role: "bidirectional" },
		],
	};
}

/** Create three-community structure */
function createThreeCommunity(): DemoFixture {
	const graph = AdjacencyMapGraph.undirected();

	// Research Lab
	const lab = ["alice", "bob", "carol", "david", "emma"];
	for (const id of lab) {
		graph.addNode({
			id,
			label: id.charAt(0).toUpperCase() + id.slice(1),
			type: "person",
		});
	}

	graph.addEdge({
		source: "alice",
		target: "bob",
		type: "collaborates",
		weight: 1,
	});
	graph.addEdge({
		source: "alice",
		target: "carol",
		type: "collaborates",
		weight: 1,
	});
	graph.addEdge({
		source: "alice",
		target: "david",
		type: "collaborates",
		weight: 1,
	});
	graph.addEdge({
		source: "bob",
		target: "carol",
		type: "collaborates",
		weight: 1,
	});
	graph.addEdge({
		source: "bob",
		target: "david",
		type: "collaborates",
		weight: 1,
	});
	graph.addEdge({
		source: "carol",
		target: "david",
		type: "collaborates",
		weight: 1,
	});
	graph.addEdge({
		source: "carol",
		target: "emma",
		type: "collaborates",
		weight: 1,
	});
	graph.addEdge({
		source: "david",
		target: "emma",
		type: "collaborates",
		weight: 1,
	});

	// Startup
	const startup = ["frank", "grace", "henry", "iris"];
	for (const id of startup) {
		graph.addNode({
			id,
			label: id.charAt(0).toUpperCase() + id.slice(1),
			type: "person",
		});
	}

	graph.addEdge({
		source: "frank",
		target: "grace",
		type: "collaborates",
		weight: 1,
	});
	graph.addEdge({
		source: "frank",
		target: "henry",
		type: "collaborates",
		weight: 1,
	});
	graph.addEdge({
		source: "frank",
		target: "iris",
		type: "collaborates",
		weight: 1,
	});
	graph.addEdge({
		source: "grace",
		target: "henry",
		type: "collaborates",
		weight: 1,
	});
	graph.addEdge({
		source: "grace",
		target: "iris",
		type: "collaborates",
		weight: 1,
	});
	graph.addEdge({
		source: "henry",
		target: "iris",
		type: "collaborates",
		weight: 1,
	});

	// University
	const university = ["jack", "kate", "liam", "mia", "noah"];
	for (const id of university) {
		graph.addNode({
			id,
			label: id.charAt(0).toUpperCase() + id.slice(1),
			type: "person",
		});
	}

	graph.addEdge({
		source: "jack",
		target: "kate",
		type: "collaborates",
		weight: 1,
	});
	graph.addEdge({
		source: "jack",
		target: "liam",
		type: "collaborates",
		weight: 1,
	});
	graph.addEdge({
		source: "kate",
		target: "liam",
		type: "collaborates",
		weight: 1,
	});
	graph.addEdge({
		source: "liam",
		target: "mia",
		type: "collaborates",
		weight: 1,
	});
	graph.addEdge({
		source: "mia",
		target: "noah",
		type: "collaborates",
		weight: 1,
	});
	graph.addEdge({
		source: "kate",
		target: "mia",
		type: "collaborates",
		weight: 1,
	});

	// Liaisons
	const liaisons = ["liaison1", "liaison2", "liaison3"];
	for (const id of liaisons) {
		graph.addNode({ id, label: id, type: "liaison" });
	}

	// Lab <-> Startup
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

	// Startup <-> University
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

	// University <-> Lab
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
		name: "three-community",
		description:
			"Three dense communities (lab, startup, university) connected by liaison bridges",
		directed: false,
		graph,
		seeds: [
			{ id: "bob", role: "bidirectional" },
			{ id: "mia", role: "bidirectional" },
		],
	};
}

/** Create typed entity directed graph */
function createTypedEntity(): DemoFixture {
	const graph = AdjacencyMapGraph.directed();

	// People
	const people = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"];
	for (const id of people) {
		graph.addNode({ id, label: `Person ${id.toUpperCase()}`, type: "person" });
	}

	// Organisations
	const orgs = ["org1", "org2", "org3"];
	for (const id of orgs) {
		graph.addNode({ id, label: id, type: "organisation" });
	}

	// Knows edges
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
		graph.addEdge({ source, target, type: "knows", weight: 1 });
	}

	// Mentors edges
	graph.addEdge({ source: "k", target: "l", type: "mentors", weight: 1 });
	graph.addEdge({ source: "f", target: "a", type: "mentors", weight: 1 });

	// Works_at edges
	const employmentEdges: readonly (readonly [string, string])[] = [
		["a", "org1"],
		["b", "org1"],
		["c", "org2"],
		["d", "org2"],
		["e", "org3"],
		["f", "org3"],
	];
	for (const [person, org] of employmentEdges) {
		graph.addEdge({ source: person, target: org, type: "works_at", weight: 1 });
	}

	return {
		name: "typed-entity",
		description:
			"Mixed entity graph with typed nodes and edges (knows/mentors/works_at)",
		directed: true,
		graph,
		seeds: [
			{ id: "a", role: "bidirectional" },
			{ id: "l", role: "bidirectional" },
		],
	};
}

/** Create quality vs popularity contrast */
function createQualityVsPopularity(): DemoFixture {
	const graph = AdjacencyMapGraph.undirected();

	// Main nodes
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
		graph.addNode({ id, label, type: "person" });
	}

	// Path A: via famous connector (high degree, low MI)
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

	// Hub leaves
	for (let i = 1; i <= 4; i++) {
		graph.addEdge({
			source: "fame_connector",
			target: `hub_leaf${String(i)}`,
			type: "knows",
			weight: 1,
		});
	}

	// Path B: via specialists (low degree, high MI)
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

	// Specialist1 cluster
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

	// Specialist2 cluster
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
		name: "quality-vs-popularity",
		description:
			"Contrasts high-popularity low-MI path vs low-popularity high-MI path",
		directed: false,
		graph,
		seeds: [
			{ id: "source", role: "bidirectional" },
			{ id: "target", role: "bidirectional" },
		],
	};
}

const FIXTURES: Record<FixtureName, () => DemoFixture> = {
	"linear-chain": createLinearChain,
	"social-hub": createSocialHub,
	"two-department": createTwoDepartment,
	"city-village": createCityVillage,
	"city-suburban-village": createCitySuburbanVillage,
	"three-community": createThreeCommunity,
	"typed-entity": createTypedEntity,
	"quality-vs-popularity": createQualityVsPopularity,
};

export function loadFixture(name: FixtureName): DemoFixture {
	const factory = FIXTURES[name];
	// TypeScript guarantees this exists since name is FixtureName
	return factory();
}

export function fixtureNames(): readonly FixtureName[] {
	const keys = Object.keys(FIXTURES);
	return keys.filter((key): key is FixtureName =>
		Object.prototype.hasOwnProperty.call(FIXTURES, key),
	);
}
