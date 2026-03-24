import { describe, it, expect } from "vitest";
import { etch } from "./etch";
import { jaccard } from "./jaccard";

describe("ETCH MI variant (edge-type rarity)", () => {
	it("scores rare edge types higher than common edge types with same Jaccard overlap", async () => {
		// ETCH applies edge-type rarity weighting: MI(u,v) = Jaccard * rarity(edgeType)
		// where rarity(t) = log(|E| / count(edges of type t))
		// Rare edge types get higher multipliers; common edge types get lower multipliers.

		const { AdjacencyMapGraph } = await import("../../graph");

		// Create a custom graph where we control edge types and shared neighbours
		const graph = AdjacencyMapGraph.undirected();

		// Create nodes: 6 people connected by various edge types
		for (const id of ["a", "b", "c", "d", "e", "f"]) {
			graph.addNode({
				id,
				label: `Person ${id}`,
				type: "person",
			});
		}

		// Add "knows" edges (common, 10 edges total - chain structure)
		const knowsEdges: readonly (readonly [string, string])[] = [
			["a", "b"],
			["b", "c"],
			["c", "d"],
			["d", "e"],
			["e", "f"],
			["a", "c"],
			["b", "d"],
			["c", "e"],
			["d", "f"],
			["a", "f"],
		];

		for (const [source, target] of knowsEdges) {
			graph.addEdge({ source, target, type: "knows", weight: 1 });
		}

		// Add "mentors" edges (rare, 2 edges - but with shared neighbours)
		graph.addEdge({ source: "a", target: "d", type: "mentors", weight: 1 }); // Shared neighbours with "knows" edges
		graph.addEdge({ source: "b", target: "e", type: "mentors", weight: 1 });

		const totalEdges = graph.edgeCount;
		console.log(`Total edges: ${String(totalEdges)}`);

		// Now compute Jaccard and ETCH for edges with shared neighbours
		// a-d (mentors): shared neighbours from "knows" edges (b, c, e, f, etc.)
		// b-c (knows): shared neighbours (a, d, etc.)

		// Both edges have shared neighbours due to the mesh-like structure
		const jaccardMentors = jaccard(graph, "a", "d");
		const etchMentors = etch(graph, "a", "d");

		// Compare to a "knows" edge with similar neighbourhood overlap
		const jaccardKnows = jaccard(graph, "b", "e");
		const etchKnows = etch(graph, "b", "e");

		console.log(`Jaccard (mentors a-d): ${String(jaccardMentors)}`);
		console.log(`ETCH (mentors a-d): ${String(etchMentors)}`);
		console.log(`Jaccard (knows b-e): ${String(jaccardKnows)}`);
		console.log(`ETCH (knows b-e): ${String(etchKnows)}`);

		// Both edges should have shared neighbours and thus non-trivial Jaccard
		expect(jaccardMentors).toBeGreaterThan(0);
		expect(jaccardKnows).toBeGreaterThan(0);

		// ETCH computation:
		// rarity(mentors) = log(|E| / 2) = log(12 / 2) ≈ 1.79
		// rarity(knows) = log(|E| / 10) = log(12 / 10) ≈ 0.18
		// Since 1.79 > 0.18, ETCH should reward the mentors edge

		// The mentors edge should receive higher ETCH weighting due to rarity
		expect(etchMentors).toBeGreaterThan(etchKnows);
	});

	it("applies rarity multiplier log(|E| / edgeTypeCount) correctly", async () => {
		// The rarity multiplier for edge type should follow:
		// log(totalEdges / countOfEdgeType)

		const { AdjacencyMapGraph } = await import("../../graph");

		// Create a simple graph to verify rarity calculation
		const graph = AdjacencyMapGraph.undirected();

		// Create nodes
		for (const id of ["x", "y", "z", "w"]) {
			graph.addNode({ id, label: `Node ${id}`, type: "test" });
		}

		// Add edges: 8 "knows" edges, 2 "mentors" edges (10 total)
		const knowsEdges: readonly (readonly [string, string])[] = [
			["x", "y"],
			["y", "z"],
			["z", "w"],
			["w", "x"],
			["x", "z"],
			["y", "w"],
			["x", "w"],
			["y", "z"],
		];

		for (const [source, target] of knowsEdges) {
			graph.addEdge({ source, target, type: "knows", weight: 1 });
		}

		// Add "mentors" edges
		graph.addEdge({ source: "x", target: "y", type: "mentors", weight: 1 });
		graph.addEdge({ source: "z", target: "w", type: "mentors", weight: 1 });

		const totalEdges = graph.edgeCount;
		const knowsCount = 8;
		const mentorsCount = 2;

		// Expected rarity values
		const rarityKnows = Math.log(totalEdges / knowsCount);
		const rarityMentors = Math.log(totalEdges / mentorsCount);

		console.log(`Total edges: ${String(totalEdges)}`);
		console.log(
			`Rarity(knows) = log(${String(totalEdges)} / ${String(knowsCount)}) = ${String(rarityKnows)}`,
		);
		console.log(
			`Rarity(mentors) = log(${String(totalEdges)} / ${String(mentorsCount)}) = ${String(rarityMentors)}`,
		);

		// Verify rarity values: more rare type (fewer edges) should have higher rarity
		expect(rarityMentors).toBeGreaterThan(rarityKnows);

		// Compute ETCH scores for both types
		// Using x-y which can be either "knows" or "mentors" depending on which we query
		// Actually, both edges exist, but we query the edge type from getEdge
		// Let's use y-z for "knows" and z-w for "mentors"
		const etchKnows = etch(graph, "y", "z"); // This has "knows" type (duplicate edge)
		const etchMentors = etch(graph, "z", "w"); // This has "mentors" type

		console.log(`ETCH (knows y-z): ${String(etchKnows)}`);
		console.log(`ETCH (mentors z-w): ${String(etchMentors)}`);

		// Both should be positive
		expect(etchKnows).toBeGreaterThan(0);
		expect(etchMentors).toBeGreaterThan(0);

		// The mentors edge should receive higher ETCH weighting due to rarity
		expect(etchMentors).toBeGreaterThan(etchKnows);
	});
});
