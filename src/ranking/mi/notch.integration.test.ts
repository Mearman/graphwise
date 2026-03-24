import { describe, it, expect } from "vitest";
import { notch } from "./notch";

describe("NOTCH MI variant (node-type rarity)", () => {
	it("scores edges involving rare node types higher than edges between common node types", async () => {
		// NOTCH applies node-type rarity weighting on both endpoints:
		// MI(u,v) = Jaccard * rarity(nodeType(u)) * rarity(nodeType(v))
		// where rarity(t) = log(|V| / count(nodes of type t))

		const { AdjacencyMapGraph } = await import("../../graph");
		const { neighbourSet, neighbourOverlap } = await import("../../utils");

		const graph = AdjacencyMapGraph.undirected();

		// Create 12 people and 3 organisations
		const people = [
			"p1",
			"p2",
			"p3",
			"p4",
			"p5",
			"p6",
			"p7",
			"p8",
			"p9",
			"p10",
			"p11",
			"p12",
		];
		const orgs = ["org1", "org2", "org3"];

		for (const id of people) {
			graph.addNode({ id, label: id, type: "person" });
		}

		for (const id of orgs) {
			graph.addNode({ id, label: id, type: "organisation" });
		}

		// Add "knows" edges between people (to create shared neighbours)
		const knowsEdges: readonly (readonly [string, string])[] = [
			["p1", "p2"],
			["p2", "p3"],
			["p3", "p4"],
			["p4", "p5"],
			["p5", "p6"],
			["p1", "p3"],
			["p2", "p4"],
			["p3", "p5"],
		];

		for (const [source, target] of knowsEdges) {
			graph.addEdge({ source, target, type: "knows", weight: 1 });
		}

		// Add "works_at" edges (person-org)
		const worksAtEdges: readonly (readonly [string, string])[] = [
			["p1", "org1"],
			["p2", "org1"],
			["p3", "org2"],
			["p4", "org2"],
		];

		for (const [person, org] of worksAtEdges) {
			graph.addEdge({
				source: person,
				target: org,
				type: "works_at",
				weight: 1,
			});
		}

		// Rarity values:
		// rarity(person) = log(15 / 12) ≈ 0.223
		// rarity(organisation) = log(15 / 3) = log(5) ≈ 1.609

		// Compute Jaccard and NOTCH for person-org edge
		const notchPersonOrg = notch(graph, "p1", "org1");

		// Compute Jaccard and NOTCH for person-person edge
		const notchPersonPerson = notch(graph, "p1", "p2");

		// NOTCH formula: Jaccard * rarity(type(u)) * rarity(type(v))
		// person-org: Jaccard * rarity(person) * rarity(org)
		// person-person: Jaccard * rarity(person) * rarity(person)

		// Since rarity(org) >> rarity(person), we expect:
		// NOTCH(person-org) > NOTCH(person-person)

		// Even if Jaccard values differ, the node type rarity multipliers
		// should give a clear advantage to person-org edges.

		expect(notchPersonOrg).toBeGreaterThan(notchPersonPerson);

		// Validate that the difference is driven by node-type rarity, not just Jaccard
		const jaccardPersonOrg =
			neighbourOverlap(
				neighbourSet(graph, "p1", "org1"),
				neighbourSet(graph, "org1", "p1"),
			).intersection /
			neighbourOverlap(
				neighbourSet(graph, "p1", "org1"),
				neighbourSet(graph, "org1", "p1"),
			).union;
		const jaccardPersonPerson =
			neighbourOverlap(
				neighbourSet(graph, "p1", "p2"),
				neighbourSet(graph, "p2", "p1"),
			).intersection /
			neighbourOverlap(
				neighbourSet(graph, "p1", "p2"),
				neighbourSet(graph, "p2", "p1"),
			).union;

		// Rarity multipliers
		const totalNodes = graph.nodeCount;
		const personRarity = Math.log(totalNodes / 12);
		const orgRarity = Math.log(totalNodes / 3);
		const personPersonMultiplier = personRarity * personRarity;
		const personOrgMultiplier = personRarity * orgRarity;

		// Verify the NOTCH calculation is consistent with rarity multipliers
		const expectedNotchPersonOrg = jaccardPersonOrg * personOrgMultiplier;
		const expectedNotchPersonPerson =
			jaccardPersonPerson * personPersonMultiplier;

		expect(notchPersonOrg).toBeCloseTo(expectedNotchPersonOrg, 5);
		expect(notchPersonPerson).toBeCloseTo(expectedNotchPersonPerson, 5);
	});

	it("isolates node-type rarity effect by using controlled Jaccard values", async () => {
		// Create edge pairs with identical Jaccard values but different node-type rarity.
		// This proves that NOTCH advantage comes from rarity, not Jaccard difference.

		const { AdjacencyMapGraph } = await import("../../graph");
		const { neighbourSet, neighbourOverlap } = await import("../../utils");

		const graph = AdjacencyMapGraph.undirected();

		// Create:
		// - 2 rare persons (rarity multiplier will be high)
		// - 3 rare organisations (rarity multiplier will be even higher)
		// - 10 common persons (rarity multiplier will be low)
		const rarePersonCount = 2;
		const rareOrgCount = 3;
		const commonPersonCount = 10;

		// Rare persons
		for (let i = 1; i <= rarePersonCount; i++) {
			const nodeId = `rp${String(i)}`;
			graph.addNode({
				id: nodeId,
				label: nodeId,
				type: "rare_person",
			});
		}

		// Rare organisations
		for (let i = 1; i <= rareOrgCount; i++) {
			const nodeId = `ro${String(i)}`;
			graph.addNode({
				id: nodeId,
				label: nodeId,
				type: "rare_org",
			});
		}

		// Common persons
		for (let i = 1; i <= commonPersonCount; i++) {
			const nodeId = `cp${String(i)}`;
			graph.addNode({
				id: nodeId,
				label: nodeId,
				type: "common_person",
			});
		}

		// Total nodes: 2 + 3 + 10 = 15
		const totalNodes = graph.nodeCount;
		expect(totalNodes).toBe(15);

		// Create shared neighbourhoods to get identical Jaccard values
		// Edge A: rp1 — ro1 (rare type endpoints)
		//   Shared neighbours: cp1, cp2, cp3
		//   rp1 neighbours (excl ro1): cp1, cp2, cp3
		//   ro1 neighbours (excl rp1): cp1, cp2, cp3
		//   Jaccard = 3 / 3 = 1.0

		const sharedNeighboursA = ["cp1", "cp2", "cp3"];
		for (const neighbour of sharedNeighboursA) {
			graph.addEdge({ source: "rp1", target: neighbour, weight: 1 });
			graph.addEdge({ source: "ro1", target: neighbour, weight: 1 });
		}

		// Edge B: cp4 — cp5 (common type endpoints)
		//   Shared neighbours: cp6, cp7, cp8
		//   cp4 neighbours (excl cp5): cp6, cp7, cp8
		//   cp5 neighbours (excl cp4): cp6, cp7, cp8
		//   Jaccard = 3 / 3 = 1.0

		const sharedNeighboursB = ["cp6", "cp7", "cp8"];
		for (const neighbour of sharedNeighboursB) {
			graph.addEdge({ source: "cp4", target: neighbour, weight: 1 });
			graph.addEdge({ source: "cp5", target: neighbour, weight: 1 });
		}

		// Verify Jaccard values are identical
		const { intersection: intA, union: unionA } = neighbourOverlap(
			neighbourSet(graph, "rp1", "ro1"),
			neighbourSet(graph, "ro1", "rp1"),
		);
		const jaccardA = intA / unionA;

		const { intersection: intB, union: unionB } = neighbourOverlap(
			neighbourSet(graph, "cp4", "cp5"),
			neighbourSet(graph, "cp5", "cp4"),
		);
		const jaccardB = intB / unionB;

		expect(jaccardA).toBe(jaccardB);
		expect(jaccardA).toBe(1.0);

		// Compute rarity multipliers
		const rarePersonRarity = Math.log(totalNodes / rarePersonCount);
		const rareOrgRarity = Math.log(totalNodes / rareOrgCount);
		const commonPersonRarity = Math.log(totalNodes / commonPersonCount);

		const rareTypeMultiplier = rarePersonRarity * rareOrgRarity;
		const commonTypeMultiplier = commonPersonRarity * commonPersonRarity;

		// Verify rarity ordering
		expect(rareTypeMultiplier).toBeGreaterThan(commonTypeMultiplier);

		// Compute NOTCH scores
		const notchRareEdge = notch(graph, "rp1", "ro1");
		const notchCommonEdge = notch(graph, "cp4", "cp5");

		// Since Jaccard values are identical, NOTCH difference is purely due to rarity
		// NOTCH = Jaccard * rarity(type1) * rarity(type2)
		//   rareEdge: 1.0 * rarePersonRarity * rareOrgRarity
		//   commonEdge: 1.0 * commonPersonRarity * commonPersonRarity
		expect(notchRareEdge).toBeCloseTo(rareTypeMultiplier, 5);
		expect(notchCommonEdge).toBeCloseTo(commonTypeMultiplier, 5);

		// The critical assertion: rarity effect is isolated from Jaccard
		expect(notchRareEdge).toBeGreaterThan(notchCommonEdge);
		expect(notchRareEdge / notchCommonEdge).toBeCloseTo(
			rareTypeMultiplier / commonTypeMultiplier,
			5,
		);
	});

	it("applies node-type rarity multiplier correctly for both endpoints", async () => {
		// Verify the NOTCH calculation: rarity multiplier = rarity(type(u)) * rarity(type(v))

		const { AdjacencyMapGraph } = await import("../../graph");

		const graph = AdjacencyMapGraph.undirected();

		// Create 12 people and 3 organisations
		const personCount = 12;
		const orgCount = 3;

		for (let i = 1; i <= personCount; i++) {
			graph.addNode({
				id: `p${String(i)}`,
				label: `p${String(i)}`,
				type: "person",
			});
		}

		for (let i = 1; i <= orgCount; i++) {
			graph.addNode({
				id: `org${String(i)}`,
				label: `org${String(i)}`,
				type: "organisation",
			});
		}

		// Add some edges to create shared neighbours
		graph.addEdge({ source: "p1", target: "p2", weight: 1 });
		graph.addEdge({ source: "p2", target: "p3", weight: 1 });
		graph.addEdge({ source: "p1", target: "p3", weight: 1 });

		graph.addEdge({ source: "p1", target: "org1", weight: 1 });
		graph.addEdge({ source: "p2", target: "org1", weight: 1 });

		const totalNodes = graph.nodeCount;

		// Expected rarity multipliers
		const rarityPersonMultiplier = Math.log(totalNodes / personCount);
		const rarityOrgMultiplier = Math.log(totalNodes / orgCount);

		const personPersonMultiplier =
			rarityPersonMultiplier * rarityPersonMultiplier;
		const personOrgMultiplier = rarityPersonMultiplier * rarityOrgMultiplier;
		const orgOrgMultiplier = rarityOrgMultiplier * rarityOrgMultiplier;

		// Verify ordering: org-org > person-org > person-person
		expect(orgOrgMultiplier).toBeGreaterThan(personOrgMultiplier);
		expect(personOrgMultiplier).toBeGreaterThan(personPersonMultiplier);

		// Compute NOTCH scores
		const notchPersonPerson = notch(graph, "p1", "p2"); // person-person
		const notchPersonOrg = notch(graph, "p1", "org1"); // person-org

		// Both should be positive
		expect(notchPersonPerson).toBeGreaterThan(0);
		expect(notchPersonOrg).toBeGreaterThan(0);

		// person-org should be significantly higher due to rarity bonus
		expect(notchPersonOrg).toBeGreaterThan(notchPersonPerson);
	});

	it("rewards edges connecting rare node types", async () => {
		// Organisation nodes are rare. Any edge involving an organisation should receive a rarity bonus.

		const { AdjacencyMapGraph } = await import("../../graph");

		const graph = AdjacencyMapGraph.undirected();

		// Create 12 people and 3 organisations
		for (let i = 1; i <= 12; i++) {
			graph.addNode({
				id: `p${String(i)}`,
				label: `p${String(i)}`,
				type: "person",
			});
		}

		for (let i = 1; i <= 3; i++) {
			graph.addNode({
				id: `org${String(i)}`,
				label: `org${String(i)}`,
				type: "organisation",
			});
		}

		// Add person-person edges (knows)
		const knowsEdges: readonly (readonly [string, string])[] = [
			["p1", "p2"],
			["p2", "p3"],
			["p3", "p4"],
			["p4", "p5"],
			["p5", "p6"],
		];

		for (const [source, target] of knowsEdges) {
			graph.addEdge({ source, target, type: "knows", weight: 1 });
		}

		// Add person-org edges (works_at)
		const worksAtEdges: readonly (readonly [string, string])[] = [
			["p1", "org1"],
			["p2", "org1"],
			["p3", "org2"],
			["p4", "org2"],
			["p5", "org3"],
			["p6", "org3"],
		];

		for (const [person, org] of worksAtEdges) {
			graph.addEdge({
				source: person,
				target: org,
				type: "works_at",
				weight: 1,
			});
		}

		// Verify edges exist
		for (const [person, org] of worksAtEdges) {
			expect(graph.getEdge(person, org)).toBeDefined();
		}

		// Compute NOTCH for person-org edges
		const notchP1Org1 = notch(graph, "p1", "org1");
		const notchP2Org1 = notch(graph, "p2", "org1");
		const notchP3Org2 = notch(graph, "p3", "org2");

		// Compute NOTCH for person-person edges
		const notchP1P2 = notch(graph, "p1", "p2");
		const notchP2P3 = notch(graph, "p2", "p3");
		const notchP3P4 = notch(graph, "p3", "p4");

		// All person-org edges should score higher than person-person edges
		// due to the rarity of organisations
		expect(notchP1Org1).toBeGreaterThan(notchP1P2);
		expect(notchP2Org1).toBeGreaterThan(notchP2P3);
		expect(notchP3Org2).toBeGreaterThan(notchP3P4);
	});
});
