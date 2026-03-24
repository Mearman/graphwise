import { describe, it, expect } from "vitest";
import { createSocialHubFixture } from "../../__test__/fixtures";
import { skew } from "./skew";
import { jaccard } from "./jaccard";

describe("SKEW MI variant (hub penalisation)", () => {
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

		console.log(`Alice degree: ${String(aliceDegree)}`);
		console.log(
			`Bob degree: ${String(bobDegree)}, Carol degree: ${String(carolDegree)}, David degree: ${String(davidDegree)}`,
		);

		// Verify edges exist
		expect(graph.getEdge("alice", "bob")).toBeDefined();
		expect(graph.getEdge("bob", "carol")).toBeDefined();

		// Compute Jaccard for both edges
		const jaccardAliceBob = jaccard(graph, "alice", "bob");
		const jaccardBobCarol = jaccard(graph, "bob", "carol");

		console.log(`Jaccard (Alice-Bob): ${String(jaccardAliceBob)}`);
		console.log(`Jaccard (Bob-Carol): ${String(jaccardBobCarol)}`);

		// Compute SKEW scores
		const skewAliceBob = skew(graph, "alice", "bob");
		const skewBobCarol = skew(graph, "bob", "carol");

		console.log(`SKEW (Alice-Bob): ${String(skewAliceBob)}`);
		console.log(`SKEW (Bob-Carol): ${String(skewBobCarol)}`);

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
			`Carol degree: ${String(carolDegree)}, Emma degree: ${String(emmaDegree)}`,
		);

		// Compute Jaccard for Carol-Emma edge
		const jaccardCarolEmma = jaccard(graph, "carol", "emma");
		const skewCarolEmma = skew(graph, "carol", "emma");

		// Compute Jaccard and SKEW for Alice-Carol (hub to low-degree)
		const jaccardAliceCarol = jaccard(graph, "alice", "carol");
		const skewAliceCarol = skew(graph, "alice", "carol");

		console.log(`Jaccard (Carol-Emma): ${String(jaccardCarolEmma)}`);
		console.log(`SKEW (Carol-Emma): ${String(skewCarolEmma)}`);
		console.log(`Jaccard (Alice-Carol): ${String(jaccardAliceCarol)}`);
		console.log(`SKEW (Alice-Carol): ${String(skewAliceCarol)}`);

		// Since Alice is a hub (high degree) and Carol is low-degree,
		// SKEW(Alice, Carol) will have one low IDF weight and one high.
		// Carol-Emma (both low-degree) will have two high IDF weights.
		// Therefore: SKEW(Carol, Emma) > SKEW(Alice, Carol)

		expect(skewCarolEmma).toBeGreaterThan(skewAliceCarol);
	});
});
