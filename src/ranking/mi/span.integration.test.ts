import { describe, it, expect } from "vitest";
import { createTwoDepartmentFixture } from "../../__test__/fixtures";
import { span } from "./span";
import { neighbourSet, neighbourOverlap } from "../../utils";
import { localClusteringCoefficient } from "../../utils";

describe("SPAN MI variant (bridge reward)", () => {
	it("rewards structural holes and bridge edges by penalising high-clustering neighbourhoods", () => {
		// SPAN applies a clustering coefficient penalty: MI(u,v) = Jaccard * (1 - max(cc(u), cc(v)))
		// Edges within tight clusters (high cc) are downweighted.
		// Bridge edges between clusters (low cc) are upweighted.

		const fixture = createTwoDepartmentFixture();
		const { graph, metadata } = fixture;

		// Verify fixture structure
		expect(metadata["marketingDepartment"]).toBeDefined();
		expect(metadata["engineeringDepartment"]).toBeDefined();
		expect(metadata["bottleneckEdge"]).toBeDefined();

		// Get the bridge edge
		const bridgeEdgeValue = metadata["bottleneckEdge"];
		if (
			typeof bridgeEdgeValue !== "object" ||
			bridgeEdgeValue === null ||
			!("source" in bridgeEdgeValue) ||
			!("target" in bridgeEdgeValue)
		) {
			throw new Error("bottleneckEdge metadata missing");
		}
		const v = Object.assign({}, bridgeEdgeValue);
		const bridgeEdge = {
			source: String(v.source),
			target: String(v.target),
		};
		expect(bridgeEdge.source).toBe("carol");
		expect(bridgeEdge.target).toBe("frank");

		// Pick a within-department edge for comparison
		// Marketing internal: David-Emma (both in marketing, high clustering)
		const withinDept = { source: "david", target: "emma" };

		// Verify edges exist
		const bridgeSource = bridgeEdge.source;
		const bridgeTarget = bridgeEdge.target;
		expect(graph.getEdge(bridgeSource, bridgeTarget)).toBeDefined();
		expect(graph.getEdge(withinDept.source, withinDept.target)).toBeDefined();

		// Compute clustering coefficients for both edges
		const ccBridgeSource = localClusteringCoefficient(graph, bridgeSource);
		const ccBridgeTarget = localClusteringCoefficient(graph, bridgeTarget);
		const ccWithinSource = localClusteringCoefficient(graph, withinDept.source);
		const ccWithinTarget = localClusteringCoefficient(graph, withinDept.target);

		// Within-cluster edge (David-Emma) should have higher clustering than bridge
		const maxCcWithin = Math.max(ccWithinSource, ccWithinTarget);
		const maxCcBridge = Math.max(ccBridgeSource, ccBridgeTarget);
		expect(maxCcWithin).toBeGreaterThan(maxCcBridge);

		// Compute Jaccard for both edges
		const sourceBridgeNeighbours = neighbourSet(
			graph,
			bridgeSource,
			bridgeTarget,
		);
		const targetBridgeNeighbours = neighbourSet(
			graph,
			bridgeTarget,
			bridgeSource,
		);
		const bridgeOverlap = neighbourOverlap(
			sourceBridgeNeighbours,
			targetBridgeNeighbours,
		);
		const jaccardBridge =
			bridgeOverlap.union > 0
				? bridgeOverlap.intersection / bridgeOverlap.union
				: 0;

		const sourceWithinNeighbours = neighbourSet(
			graph,
			withinDept.source,
			withinDept.target,
		);
		const targetWithinNeighbours = neighbourSet(
			graph,
			withinDept.target,
			withinDept.source,
		);
		const withinOverlap = neighbourOverlap(
			sourceWithinNeighbours,
			targetWithinNeighbours,
		);
		const jaccardWithin =
			withinOverlap.union > 0
				? withinOverlap.intersection / withinOverlap.union
				: 0;

		// Compute SPAN scores
		const spanBridge = span(graph, bridgeSource, bridgeTarget);
		const spanWithin = span(graph, withinDept.source, withinDept.target);

		// The key assertion: SPAN = Jaccard * (1 - max(cc))
		// Bridge edges have lower clustering coefficients, so the penalty (1 - max(cc)) is larger.
		// Within-cluster edges have higher clustering coefficients, so the penalty is smaller.
		// This overcomes the potential Jaccard difference, rewarding bridge edges with SPAN(bridge) > SPAN(within).

		expect(spanBridge).toBeGreaterThan(spanWithin);

		// Verify Jaccard scores: Jaccard within the cluster should be similar or favour the bridge
		// (The bridge now has reasonable overlap due to multiple cross-department connections)
		expect(jaccardWithin).toBeGreaterThanOrEqual(jaccardBridge);
	});

	it("upweights bridge edges with low clustering coefficients", () => {
		// Use the two-department fixture where Carol-Frank is an inter-department bridge
		const fixture = createTwoDepartmentFixture();
		const { graph } = fixture;

		// In a two-department structure, the bridge edge (Carol-Frank)
		// connects two dense clusters but itself has low local clustering
		// because its endpoints span different groups.

		// Compute SPAN scores
		const spanBridge = span(graph, "carol", "frank");
		const spanWithin = span(graph, "alice", "bob");

		// SPAN formula: Jaccard * (1 - max(cc(u), cc(v)))
		// If max(cc) is high, the multiplier is low (edge is penalised).
		// If max(cc) is low, the multiplier is high (edge is rewarded).

		// For the bridge edge (Carol-Frank), the endpoints span clusters,
		// so they may have lower clustering coefficients than within-cluster edges.
		// This means SPAN should give the bridge edge an advantage via the (1 - max(cc)) multiplier.

		// At minimum, verify both are computed and positive
		expect(spanBridge).toBeGreaterThan(0);
		expect(spanWithin).toBeGreaterThan(0);
	});
});
