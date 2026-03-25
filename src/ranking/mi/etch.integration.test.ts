import { describe, it, expect } from "vitest";
import { etch } from "./etch";
import { jaccard } from "./jaccard";
import { parse } from "../parse";
import { createPath } from "../../__test__/fixtures";

describe("ETCH MI variant (edge-type rarity)", () => {
	it("scores rare edge types higher than common edge types with same Jaccard overlap", async () => {
		// ETCH applies edge-type rarity weighting: MI(u,v) = Jaccard * rarity(edgeType)
		// where rarity(t) = log(|E| / count(edges of type t))
		// Rare edge types get higher multipliers; common edge types get lower multipliers.
		//
		// Test strategy: create two edge pairs with identical Jaccard neighbourhood overlap
		// but different edge-type rarity. Assert that ETCH scores differ due to rarity alone.

		const { AdjacencyMapGraph } = await import("../../graph");

		// Create a custom graph with controlled structure
		const graph = AdjacencyMapGraph.undirected();

		// Create 10 nodes
		// Structure: two edge pairs with identical neighbourhoods
		//   Pair 1: u1-v1 (mentors, rare: 2 edges total)
		//   Pair 2: u2-v2 (knows, common: 10 edges total)
		//   Each pair has exactly 2 shared neighbours: s1, s2
		for (const id of [
			"u1",
			"v1",
			"u2",
			"v2",
			"s1",
			"s2",
			"x1",
			"x2",
			"x3",
			"x4",
		]) {
			graph.addNode({
				id,
				label: `Node ${id}`,
				type: "test",
			});
		}

		// Pair 1: u1-v1 (mentors, rare)
		// Neighbourhoods: u1 → {s1, s2}, v1 → {s1, s2}
		// Jaccard(u1, v1) = |{s1,s2}| / |{s1,s2}| = 2/2 = 1.0
		graph.addEdge({ source: "u1", target: "s1", type: "knows", weight: 1 });
		graph.addEdge({ source: "u1", target: "s2", type: "knows", weight: 1 });
		graph.addEdge({ source: "v1", target: "s1", type: "knows", weight: 1 });
		graph.addEdge({ source: "v1", target: "s2", type: "knows", weight: 1 });
		graph.addEdge({ source: "u1", target: "v1", type: "mentors", weight: 1 }); // rare edge

		// Pair 2: u2-v2 (knows, common)
		// Neighbourhoods: u2 → {s1, s2}, v2 → {s1, s2}
		// Jaccard(u2, v2) = |{s1,s2}| / |{s1,s2}| = 2/2 = 1.0
		graph.addEdge({ source: "u2", target: "s1", type: "knows", weight: 1 });
		graph.addEdge({ source: "u2", target: "s2", type: "knows", weight: 1 });
		graph.addEdge({ source: "v2", target: "s1", type: "knows", weight: 1 });
		graph.addEdge({ source: "v2", target: "s2", type: "knows", weight: 1 });
		graph.addEdge({ source: "u2", target: "v2", type: "knows", weight: 1 }); // common edge

		// Add 8 more "knows" edges (to make 10 total "knows")
		// Use isolated node sets to avoid affecting neighbourhoods of Pair 1 or Pair 2
		graph.addEdge({ source: "s1", target: "s2", type: "knows", weight: 1 });
		graph.addEdge({ source: "x1", target: "x2", type: "knows", weight: 1 });
		graph.addEdge({ source: "x2", target: "x3", type: "knows", weight: 1 });
		graph.addEdge({ source: "x3", target: "x4", type: "knows", weight: 1 });
		graph.addEdge({ source: "x4", target: "x1", type: "knows", weight: 1 });
		graph.addEdge({ source: "x1", target: "x3", type: "knows", weight: 1 });
		graph.addEdge({ source: "x2", target: "x4", type: "knows", weight: 1 });

		// Add one more "mentors" edge (to make 2 total "mentors")
		graph.addEdge({ source: "s1", target: "s2", type: "mentors", weight: 1 });

		const totalEdges = graph.edgeCount;
		const knowsCount = 10;
		const mentorsCount = 2;

		console.log(`Total edges: ${String(totalEdges)}`);
		console.log(`Knows count: ${String(knowsCount)}`);
		console.log(`Mentors count: ${String(mentorsCount)}`);

		// Compute Jaccard for both pairs (must be identical since they have identical neighbourhood structure)
		const jaccardRareType = jaccard(graph, "u1", "v1");
		const jaccardCommonType = jaccard(graph, "u2", "v2");

		// Compute ETCH for both pairs
		const etchRareType = etch(graph, "u1", "v1");
		const etchCommonType = etch(graph, "u2", "v2");

		console.log(`\nJaccard (rare type u1-v1): ${String(jaccardRareType)}`);
		console.log(`ETCH (rare type u1-v1): ${String(etchRareType)}`);
		console.log(`Jaccard (common type u2-v2): ${String(jaccardCommonType)}`);
		console.log(`ETCH (common type u2-v2): ${String(etchCommonType)}`);

		// Expected rarity values
		const rarityRare = Math.log(totalEdges / mentorsCount);
		const rarityCommon = Math.log(totalEdges / knowsCount);
		console.log(
			`\nRarity (mentors) = log(${String(totalEdges)} / ${String(mentorsCount)}) = ${String(rarityRare)}`,
		);
		console.log(
			`Rarity (knows) = log(${String(totalEdges)} / ${String(knowsCount)}) = ${String(rarityCommon)}`,
		);

		// ASSERTION 1: Jaccard values must be identical (or near-identical)
		// This proves that the only difference between the edge pairs is the edge type rarity
		expect(jaccardRareType).toBeCloseTo(jaccardCommonType, 5);
		expect(jaccardRareType).toBeGreaterThan(0);

		// ASSERTION 2: Rarity multiplier for rare type must be > common type
		expect(rarityRare).toBeGreaterThan(rarityCommon);

		// ASSERTION 3: ETCH scores reflect the rarity difference
		// Since Jaccard is identical, ETCH(rare) should be significantly higher than ETCH(common)
		// because ETCH(rare) = Jaccard * rarityRare, ETCH(common) = Jaccard * rarityCommon,
		// and rarityRare > rarityCommon
		expect(etchRareType).toBeGreaterThan(etchCommonType);

		// ASSERTION 4: ETCH difference should be proportional to rarity difference
		// Verify that ETCH ratio is at least as large as rarity ratio
		const rarityRatio = rarityRare / rarityCommon;
		const etchRatio = etchRareType / etchCommonType;

		console.log(`\nRarity ratio (rare/common): ${String(rarityRatio)}`);
		console.log(`ETCH ratio (rare/common): ${String(etchRatio)}`);
		console.log(
			`ETCH ratio >= Rarity ratio: ${String(etchRatio >= rarityRatio)}`,
		);

		// ETCH ratio should be at least equal to rarity ratio (since Jaccard is identical)
		expect(etchRatio).toBeGreaterThanOrEqual(rarityRatio - 0.01); // small tolerance for floating point
	});

	it("produces different PARSE rankings than Jaccard", async () => {
		// ETCH weights Jaccard by edge-type rarity: log(|E| / count(type)).
		// Paths that traverse rare edge types score higher under ETCH than under Jaccard.
		// PARSE+ETCH therefore produces different salience values from PARSE+Jaccard
		// on a graph with mixed edge-type rarity.
		//
		// Strategy: reuse the controlled graph structure with two edge-type frequencies.
		// - "mentors" edges: rare (2 total)
		// - "knows" edges: common (10 total)
		// Build paths that cross both edge types; ETCH inflates the rare-type edges.

		const { AdjacencyMapGraph } = await import("../../graph");

		const graph = AdjacencyMapGraph.undirected();

		for (const id of [
			"u1",
			"v1",
			"u2",
			"v2",
			"s1",
			"s2",
			"x1",
			"x2",
			"x3",
			"x4",
		]) {
			graph.addNode({ id, label: `Node ${id}`, type: "test" });
		}

		// Pair 1: u1-v1 connected via rare "mentors" edge
		graph.addEdge({ source: "u1", target: "s1", type: "knows", weight: 1 });
		graph.addEdge({ source: "u1", target: "s2", type: "knows", weight: 1 });
		graph.addEdge({ source: "v1", target: "s1", type: "knows", weight: 1 });
		graph.addEdge({ source: "v1", target: "s2", type: "knows", weight: 1 });
		graph.addEdge({ source: "u1", target: "v1", type: "mentors", weight: 1 });

		// Pair 2: u2-v2 connected via common "knows" edge
		graph.addEdge({ source: "u2", target: "s1", type: "knows", weight: 1 });
		graph.addEdge({ source: "u2", target: "s2", type: "knows", weight: 1 });
		graph.addEdge({ source: "v2", target: "s1", type: "knows", weight: 1 });
		graph.addEdge({ source: "v2", target: "s2", type: "knows", weight: 1 });
		graph.addEdge({ source: "u2", target: "v2", type: "knows", weight: 1 });

		// Additional "knows" edges to make it the common type
		graph.addEdge({ source: "s1", target: "s2", type: "knows", weight: 1 });
		graph.addEdge({ source: "x1", target: "x2", type: "knows", weight: 1 });
		graph.addEdge({ source: "x2", target: "x3", type: "knows", weight: 1 });
		graph.addEdge({ source: "x3", target: "x4", type: "knows", weight: 1 });
		graph.addEdge({ source: "x4", target: "x1", type: "knows", weight: 1 });
		graph.addEdge({ source: "x1", target: "x3", type: "knows", weight: 1 });
		graph.addEdge({ source: "x2", target: "x4", type: "knows", weight: 1 });

		// Second "mentors" edge — keeps the type rare
		graph.addEdge({ source: "s1", target: "s2", type: "mentors", weight: 1 });

		const paths = [
			// Path across the rare "mentors" edge: u1 → v1, both connected to s1/s2
			createPath(["s1", "u1", "v1"]),
			// Path across the common "knows" edge: u2 → v2
			createPath(["s1", "u2", "v2"]),
			// Short path within the "knows" chain
			createPath(["x1", "x2", "x3"]),
		];

		const parseJaccard = parse(graph, paths, { mi: jaccard });
		const parseEtch = parse(graph, paths, { mi: etch });

		const jaccardScores = parseJaccard.paths.map((p) => p.salience);
		const etchScores = parseEtch.paths.map((p) => p.salience);

		// ETCH boosts the path through the rare "mentors" edge more than Jaccard does,
		// so at least one salience value must differ between the two rankings.
		const differ = jaccardScores.some(
			(s, i) => Math.abs(s - (etchScores[i] ?? 0)) > 1e-9,
		);
		expect(differ).toBe(true);
	});

	it("applies rarity multiplier log(|E| / edgeTypeCount) correctly", async () => {
		// The rarity multiplier for edge type should follow:
		// log(totalEdges / countOfEdgeType)
		//
		// Test strategy: create two edge pairs with identical Jaccard values
		// but compare edges of different types (rare vs common).

		const { AdjacencyMapGraph } = await import("../../graph");

		// Create a simple graph to verify rarity calculation
		const graph = AdjacencyMapGraph.undirected();

		// Create nodes with controlled neighbourhood structure
		// Structure:
		//   Pair 1: a-b (rare type "special", 2 edges total)
		//     Both a and b connect to: p1, p2
		//     Jaccard(a,b) = 2/2 = 1.0
		//
		//   Pair 2: x-y (common type "knows", 8 edges total)
		//     Both x and y connect to: p1, p2
		//     Jaccard(x,y) = 2/2 = 1.0
		//
		// Extra edges added to make "knows" common and "special" rare.
		for (const id of ["a", "b", "x", "y", "p1", "p2", "e1", "e2", "e3", "e4"]) {
			graph.addNode({ id, label: `Node ${id}`, type: "test" });
		}

		// Pair 1: a-b with rare type "special"
		// Neighbourhoods: a → {p1, p2}, b → {p1, p2}
		// Jaccard(a,b) = 2/2 = 1.0
		graph.addEdge({ source: "a", target: "p1", type: "knows", weight: 1 });
		graph.addEdge({ source: "a", target: "p2", type: "knows", weight: 1 });
		graph.addEdge({ source: "b", target: "p1", type: "knows", weight: 1 });
		graph.addEdge({ source: "b", target: "p2", type: "knows", weight: 1 });
		graph.addEdge({ source: "a", target: "b", type: "special", weight: 1 }); // rare edge

		// Pair 2: x-y with common type "knows"
		// Neighbourhoods: x → {p1, p2}, y → {p1, p2}
		// Jaccard(x,y) = 2/2 = 1.0
		graph.addEdge({ source: "x", target: "p1", type: "knows", weight: 1 });
		graph.addEdge({ source: "x", target: "p2", type: "knows", weight: 1 });
		graph.addEdge({ source: "y", target: "p1", type: "knows", weight: 1 });
		graph.addEdge({ source: "y", target: "p2", type: "knows", weight: 1 });
		graph.addEdge({ source: "x", target: "y", type: "knows", weight: 1 }); // common edge

		// Add extra "knows" edges to make "knows" type common (8 total knows edges)
		// Use isolated edges to avoid affecting neighbourhoods of Pair 1 or Pair 2
		graph.addEdge({ source: "p1", target: "p2", type: "knows", weight: 1 });
		graph.addEdge({ source: "e1", target: "e2", type: "knows", weight: 1 });
		graph.addEdge({ source: "e2", target: "e3", type: "knows", weight: 1 });
		graph.addEdge({ source: "e3", target: "e4", type: "knows", weight: 1 });
		graph.addEdge({ source: "e4", target: "e1", type: "knows", weight: 1 });
		graph.addEdge({ source: "e1", target: "e3", type: "knows", weight: 1 });

		// Add one more "special" edge to confirm it's rare (2 total special edges)
		graph.addEdge({ source: "p1", target: "p2", type: "special", weight: 1 });

		const totalEdges = graph.edgeCount;
		const knowsCount = 8;
		const specialCount = 2;

		// Expected rarity values
		const rarityKnows = Math.log(totalEdges / knowsCount);
		const raritySpecial = Math.log(totalEdges / specialCount);

		console.log(`Total edges: ${String(totalEdges)}`);
		console.log(
			`Rarity(knows) = log(${String(totalEdges)} / ${String(knowsCount)}) = ${String(rarityKnows)}`,
		);
		console.log(
			`Rarity(special) = log(${String(totalEdges)} / ${String(specialCount)}) = ${String(raritySpecial)}`,
		);

		// Verify rarity values: more rare type (fewer edges) should have higher rarity
		expect(raritySpecial).toBeGreaterThan(rarityKnows);

		// Compute Jaccard for both pairs (must be identical)
		const jaccardRareType = jaccard(graph, "a", "b");
		const jaccardCommonType = jaccard(graph, "x", "y");

		// Compute ETCH scores for both types
		const etchSpecial = etch(graph, "a", "b"); // Rare type
		const etchKnows = etch(graph, "x", "y"); // Common type

		console.log(`\nJaccard (special a-b): ${String(jaccardRareType)}`);
		console.log(`ETCH (special a-b): ${String(etchSpecial)}`);
		console.log(`Jaccard (knows x-y): ${String(jaccardCommonType)}`);
		console.log(`ETCH (knows x-y): ${String(etchKnows)}`);

		// ASSERTION 1: Jaccard values must be identical
		// This proves that the only difference is the edge type rarity
		expect(jaccardRareType).toBeCloseTo(jaccardCommonType, 5);
		expect(jaccardRareType).toBeGreaterThan(0);

		// ASSERTION 2: Both ETCH scores should be positive
		expect(etchSpecial).toBeGreaterThan(0);
		expect(etchKnows).toBeGreaterThan(0);

		// ASSERTION 3: The rare edge should receive higher ETCH weighting due to rarity
		// ETCH(special) = Jaccard * raritySpecial
		// ETCH(knows) = Jaccard * rarityKnows
		// Since Jaccard is the same, ETCH(special) > ETCH(knows) because raritySpecial > rarityKnows
		expect(etchSpecial).toBeGreaterThan(etchKnows);

		// ASSERTION 4: ETCH difference should be proportional to rarity difference
		// Verify that ETCH ratio is at least as large as rarity ratio
		const rarityRatio = raritySpecial / rarityKnows;
		const etchRatio = etchSpecial / etchKnows;

		console.log(`\nRarity ratio (special/knows): ${String(rarityRatio)}`);
		console.log(`ETCH ratio (special/knows): ${String(etchRatio)}`);
		console.log(
			`ETCH ratio >= Rarity ratio: ${String(etchRatio >= rarityRatio)}`,
		);

		// ETCH ratio should be at least equal to rarity ratio (since Jaccard is identical)
		expect(etchRatio).toBeGreaterThanOrEqual(rarityRatio - 0.01); // small tolerance for floating point
	});
});
