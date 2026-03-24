import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../../graph";
import { createSocialHubFixture } from "../../__test__/fixtures";
import { skew } from "./skew";
import { jaccard } from "./jaccard";

describe("SKEW MI variant (hub penalisation)", () => {
	it("isolates IDF weighting by comparing edges with identical Jaccard values", () => {
		// SKEW = Jaccard × log(N/(deg(u)+1)) × log(N/(deg(v)+1))
		// To verify IDF weighting, construct two edges with identical Jaccard overlap
		// but different endpoint degrees. SKEW difference proves degree-based weighting.

		// Build controlled graph: two edges with same neighbourhood overlap
		const graph = AdjacencyMapGraph.undirected();

		// Low-degree edge: A-B with low-degree endpoints
		// Each has neighbours {other node, X}
		graph.addNode({ id: "a", label: "A", type: "test" });
		graph.addNode({ id: "b", label: "B", type: "test" });
		graph.addNode({ id: "x", label: "X", type: "test" });

		graph.addEdge({ source: "a", target: "b", type: "knows", weight: 1 });
		graph.addEdge({ source: "a", target: "x", type: "knows", weight: 1 });
		graph.addEdge({ source: "b", target: "x", type: "knows", weight: 1 });

		// High-degree edge: C-D with hub endpoint C
		// C connected to {D, X, Y, Z, W} (degree 5)
		// D connected to {C, X, Y, Z, W} (degree 5)
		// Result: neighbourhoods {X,Y,Z,W} and {X,Y,Z,W} after exclusion
		graph.addNode({ id: "c", label: "C", type: "test" });
		graph.addNode({ id: "d", label: "D", type: "test" });
		graph.addNode({ id: "y", label: "Y", type: "test" });
		graph.addNode({ id: "z", label: "Z", type: "test" });
		graph.addNode({ id: "w", label: "W", type: "test" });

		graph.addEdge({ source: "c", target: "d", type: "knows", weight: 1 });
		graph.addEdge({ source: "c", target: "x", type: "knows", weight: 1 });
		graph.addEdge({ source: "c", target: "y", type: "knows", weight: 1 });
		graph.addEdge({ source: "c", target: "z", type: "knows", weight: 1 });
		graph.addEdge({ source: "c", target: "w", type: "knows", weight: 1 });

		graph.addEdge({ source: "d", target: "x", type: "knows", weight: 1 });
		graph.addEdge({ source: "d", target: "y", type: "knows", weight: 1 });
		graph.addEdge({ source: "d", target: "z", type: "knows", weight: 1 });
		graph.addEdge({ source: "d", target: "w", type: "knows", weight: 1 });

		// Verify degrees
		const degreeA = graph.degree("a");
		const degreeB = graph.degree("b");
		const degreeC = graph.degree("c");
		const degreeD = graph.degree("d");

		console.log(
			`Low-degree edge (A-B): degrees=(${degreeA.toString()}, ${degreeB.toString()})`,
		);
		console.log(
			`High-degree edge (C-D): degrees=(${degreeC.toString()}, ${degreeD.toString()})`,
		);

		// Verify Jaccard values are identical
		const jaccardAB = jaccard(graph, "a", "b");
		const jaccardCD = jaccard(graph, "c", "d");

		console.log(`Jaccard (A-B): ${jaccardAB.toString()}`);
		console.log(`Jaccard (C-D): ${jaccardCD.toString()}`);

		// Assert Jaccard values are equal (within floating-point tolerance)
		expect(Math.abs(jaccardAB - jaccardCD)).toBeLessThan(1e-9);

		// Compute SKEW scores
		const skewAB = skew(graph, "a", "b");
		const skewCD = skew(graph, "c", "d");

		console.log(`SKEW (A-B): ${skewAB.toString()}`);
		console.log(`SKEW (C-D): ${skewCD.toString()}`);

		// IDF weighting: log(N/(deg+1))
		// N=8 nodes
		// A,B: log(8/3) ≈ 0.98 each
		// C,D: log(8/6) ≈ 0.29 each
		// SKEW(A-B) ∝ 0.98 × 0.98 ≈ 0.96
		// SKEW(C-D) ∝ 0.29 × 0.29 ≈ 0.08
		// Therefore: SKEW(A-B) >> SKEW(C-D) despite identical Jaccard

		expect(skewAB).toBeGreaterThan(skewCD);
		expect(skewAB / skewCD).toBeGreaterThan(5); // Significant IDF boost
	});

	it("penalises edges involving high-degree hubs, rewarding edges between low-degree nodes", () => {
		// SKEW applies IDF-style rarity weighting to endpoints.
		// Low-degree nodes get higher weights; high-degree hubs get lower weights.
		// This should reward discovery paths through rare (low-degree) nodes.

		const fixture = createSocialHubFixture();
		const { graph, metadata } = fixture;

		// Verify fixture structure: Alice is a hub
		expect(metadata["hubNode"]).toBe("alice");
		expect(metadata["clusters"]).toBeDefined();

		// Get degree of Alice (should be high: 10)
		const aliceDegree = graph.degree("alice");
		expect(aliceDegree).toBeGreaterThan(5); // Alice is definitely a hub

		// Get degree of Bob and Carol (should be low: 2-3)
		const bobDegree = graph.degree("bob");
		const carolDegree = graph.degree("carol");
		const davidDegree = graph.degree("david");

		console.log(`Alice degree: ${aliceDegree.toString()}`);
		console.log(
			`Bob degree: ${bobDegree.toString()}, Carol degree: ${carolDegree.toString()}, David degree: ${davidDegree.toString()}`,
		);

		// Verify edges exist
		expect(graph.getEdge("alice", "bob")).toBeDefined();
		expect(graph.getEdge("bob", "carol")).toBeDefined();

		// Compute Jaccard for both edges
		const jaccardAliceBob = jaccard(graph, "alice", "bob");
		const jaccardBobCarol = jaccard(graph, "bob", "carol");

		console.log(`Jaccard (Alice-Bob): ${jaccardAliceBob.toString()}`);
		console.log(`Jaccard (Bob-Carol): ${jaccardBobCarol.toString()}`);

		// Compute SKEW scores
		const skewAliceBob = skew(graph, "alice", "bob");
		const skewBobCarol = skew(graph, "bob", "carol");

		console.log(`SKEW (Alice-Bob): ${skewAliceBob.toString()}`);
		console.log(`SKEW (Bob-Carol): ${skewBobCarol.toString()}`);

		// SKEW applies log(N / (deg(u) + 1)) * log(N / (deg(v) + 1)) to Jaccard
		// Alice has high degree → low IDF weight
		// Bob and Carol have low degrees → high IDF weights
		// Therefore: SKEW(Bob, Carol) should be significantly higher than SKEW(Alice, Bob)
		// due to the IDF boost on low-degree endpoints

		expect(skewBobCarol).toBeGreaterThan(skewAliceBob);

		// Verify that both scores are positive
		expect(skewAliceBob).toBeGreaterThan(0);
		expect(skewBobCarol).toBeGreaterThan(0);
	});

	it("applies greater weighting to edges between rare (low-degree) nodes", () => {
		// In the social hub graph, Carol-Emma is a cross-cluster bridge.
		// Both Carol and Emma have similar low-to-moderate degree.
		// They should receive higher SKEW weighting than Alice connections.

		const fixture = createSocialHubFixture();
		const { graph } = fixture;

		// Carol and Emma form a cross-cluster bridge
		const carolDegree = graph.degree("carol");
		const emmaDegree = graph.degree("emma");

		console.log(
			`Carol degree: ${carolDegree.toString()}, Emma degree: ${emmaDegree.toString()}`,
		);

		// Compute Jaccard for Carol-Emma edge
		const jaccardCarolEmma = jaccard(graph, "carol", "emma");
		const skewCarolEmma = skew(graph, "carol", "emma");

		// Compute Jaccard and SKEW for Alice-Carol (hub to low-degree)
		const jaccardAliceCarol = jaccard(graph, "alice", "carol");
		const skewAliceCarol = skew(graph, "alice", "carol");

		console.log(`Jaccard (Carol-Emma): ${jaccardCarolEmma.toString()}`);
		console.log(`SKEW (Carol-Emma): ${skewCarolEmma.toString()}`);
		console.log(`Jaccard (Alice-Carol): ${jaccardAliceCarol.toString()}`);
		console.log(`SKEW (Alice-Carol): ${skewAliceCarol.toString()}`);

		// Since Alice is a hub (high degree) and Carol is low-degree,
		// SKEW(Alice, Carol) will have one low IDF weight and one high.
		// Carol-Emma (both low-degree) will have two high IDF weights.
		// Therefore: SKEW(Carol, Emma) > SKEW(Alice, Carol)

		expect(skewCarolEmma).toBeGreaterThan(skewAliceCarol);
	});
});
