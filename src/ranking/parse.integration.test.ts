/**
 * PARSE ranking integration tests.
 *
 * Demonstrates three structural advantages of PARSE's geometric mean approach
 * over arithmetic-mean and degree-sum baselines through realistic graph scenarios.
 *
 * @module ranking/parse.integration.test
 */

import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import type { NodeData } from "../graph";
import { parse } from "./parse";
import { jaccardArithmetic, degreeSum } from "./baselines";
import { jaccard } from "./mi";
import { createSocialHubFixture, createPath } from "../__test__/fixtures";

interface TestNode extends NodeData {
	readonly label: string;
	readonly type?: string;
}

/**
 * Sub-test 1: Weak-Link Sensitivity
 *
 * PARSE's geometric mean penalises paths containing weak edges,
 * even if the overall path length is the same.
 * Arithmetic mean treats all edges equally, masking weak links.
 */
describe("PARSE ranking integration tests", () => {
	it("penalises weak-link paths via geometric mean (Weak-Link Sensitivity)", () => {
		// Create a custom graph demonstrating weak-link sensitivity
		// This is different from the fixture to show the concept clearly
		const graph = AdjacencyMapGraph.undirected<TestNode>();

		// Two clusters with a weak bridge
		const clusterA = ["a1", "a2", "a3"];
		const clusterB = ["b1", "b2", "b3"];

		// Add cluster A nodes
		for (const id of clusterA) {
			graph.addNode({ id, label: `Node ${id}` });
		}

		// Add cluster B nodes
		for (const id of clusterB) {
			graph.addNode({ id, label: `Node ${id}` });
		}

		// Cluster A: dense connections (all pairs connected)
		graph.addEdge({ source: "a1", target: "a2", weight: 1 });
		graph.addEdge({ source: "a2", target: "a3", weight: 1 });
		graph.addEdge({ source: "a1", target: "a3", weight: 1 });

		// Cluster B: dense connections (all pairs connected)
		graph.addEdge({ source: "b1", target: "b2", weight: 1 });
		graph.addEdge({ source: "b2", target: "b3", weight: 1 });
		graph.addEdge({ source: "b1", target: "b3", weight: 1 });

		// Weak bridge: only a1 and b1 are connected
		// No other cross-cluster edges exist
		graph.addEdge({ source: "a1", target: "b1", weight: 1 });

		// Path A: Within cluster A (2 hops, all strong edges with high overlap)
		// a1 -> a2 -> a3
		const pathA = createPath(["a1", "a2", "a3"]);

		// Path B: Uses the weak bridge (2 hops, but middle edge is weak bridge with few shared neighbours)
		// a1 -> b1 -> b2
		// The a1->b1 edge is a weak bridge (a1 and b1 have no common neighbours due to cluster separation)
		const pathB = createPath(["a1", "b1", "b2"]);

		// Compute PARSE scores
		const parseResult = parse(graph, [pathA, pathB], { mi: jaccard });

		// Compute baseline scores for comparison
		const arithmeticResult = jaccardArithmetic(graph, [pathA, pathB]);

		const parsePathA = parseResult.paths.find((p) =>
			p.nodes.every((n, i) => n === pathA.nodes[i]),
		);
		const parsePathB = parseResult.paths.find((p) =>
			p.nodes.every((n, i) => n === pathB.nodes[i]),
		);
		const arithmeticPathA = arithmeticResult.paths.find((p) =>
			p.nodes.every((n, i) => n === pathA.nodes[i]),
		);
		const arithmeticPathB = arithmeticResult.paths.find((p) =>
			p.nodes.every((n, i) => n === pathB.nodes[i]),
		);

		// Verify paths were ranked
		expect(parsePathA).toBeDefined();
		expect(parsePathB).toBeDefined();
		expect(arithmeticPathA).toBeDefined();
		expect(arithmeticPathB).toBeDefined();

		// PARSE should rank Path A higher due to geometric mean penalising the weak bridge
		const parsePathASalience = parsePathA?.salience ?? 0;
		const parsePathBSalience = parsePathB?.salience ?? 0;
		expect(parsePathASalience).toBeGreaterThan(parsePathBSalience);

		// Arithmetic mean should rank them closer together (less penalisation of weak link)
		const arithmeticPathAScore = arithmeticPathA?.score ?? 0;
		const arithmeticPathBScore = arithmeticPathB?.score ?? 0;
		const parseGap = parsePathASalience - parsePathBSalience;
		const arithmeticGap = arithmeticPathAScore - arithmeticPathBScore;

		// The gap should be larger in PARSE (geometric mean penalises weak links more strongly)
		expect(parseGap).toBeGreaterThan(arithmeticGap);
	});

	it("ranks length-equivalent paths similarly (Length Independence)", () => {
		// Create a simple chain graph with uniform MI across all edges
		const graph = AdjacencyMapGraph.undirected<TestNode>();

		// Create a chain: A-B-C-D-E-F-G with uniform edge properties
		const nodes = ["A", "B", "C", "D", "E", "F", "G"];
		for (const id of nodes) {
			graph.addNode({
				id,
				label: `Node ${id}`,
				type: "chain",
			});
		}

		// All edges have uniform weight (high MI)
		for (let i = 0; i < nodes.length - 1; i++) {
			const source = nodes[i];
			const target = nodes[i + 1];
			if (source !== undefined && target !== undefined) {
				graph.addEdge({ source, target, weight: 1, type: "connected" });
			}
		}

		// Path A: 2 hops (short, uniform high MI)
		const pathA = createPath(["A", "B", "C"]);

		// Path B: 5 hops (longer, same average edge MI quality)
		const pathB = createPath(["A", "B", "C", "D", "E", "F"]);

		// Compute PARSE scores (geometric mean is length-independent)
		const parseResult = parse(graph, [pathA, pathB], { mi: jaccard });

		// Compute degree-sum baseline (length-biased)
		const degreeSumResult = degreeSum(graph, [pathA, pathB]);

		const parsePathA = parseResult.paths.find((p) =>
			p.nodes.every((n, i) => n === pathA.nodes[i]),
		);
		const parsePathB = parseResult.paths.find((p) =>
			p.nodes.every((n, i) => n === pathB.nodes[i]),
		);
		const degreeSumPathA = degreeSumResult.paths.find((p) =>
			p.nodes.every((n, i) => n === pathA.nodes[i]),
		);
		const degreeSumPathB = degreeSumResult.paths.find((p) =>
			p.nodes.every((n, i) => n === pathB.nodes[i]),
		);

		expect(parsePathA).toBeDefined();
		expect(parsePathB).toBeDefined();
		expect(degreeSumPathA).toBeDefined();
		expect(degreeSumPathB).toBeDefined();

		// PARSE scores should be approximately equal (within epsilon tolerance)
		const parsePathASalience = parsePathA?.salience ?? 0;
		const parsePathBSalience = parsePathB?.salience ?? 0;
		const epsilon = 0.01; // Allow small numerical error
		expect(Math.abs(parsePathASalience - parsePathBSalience)).toBeLessThan(
			epsilon,
		);

		// Degree-sum should rank Path B much higher due to more nodes
		const degreeSumPathAScore = degreeSumPathA?.score ?? 0;
		const degreeSumPathBScore = degreeSumPathB?.score ?? 0;
		expect(degreeSumPathBScore).toBeGreaterThan(degreeSumPathAScore);
	});

	it("ranks high-MI paths above hub paths (Hub-Path Penalisation)", () => {
		// Create a social hub graph from fixture
		const fixture = createSocialHubFixture();
		// Fix type: fixture.graph is properly typed as AdjacencyMapGraph
		const graph = fixture.graph;

		// Path A: Bob -> Alice -> Carol
		// Alice is a hub (degree 10+), edges are low MI (many shared neighbours dilute similarity)
		const pathA = createPath(["bob", "alice", "carol"]);

		// Path B: Bob -> Carol -> David
		// Direct path through specialist cluster (photography club),
		// edges have high MI (shared neighbours within tight cluster)
		const pathB = createPath(["bob", "carol", "david"]);

		// Compute PARSE scores
		const parseResult = parse(graph, [pathA, pathB], { mi: jaccard });

		// Compute degree-sum baseline (favours hubs)
		const degreeSumResult = degreeSum(graph, [pathA, pathB]);

		const parsePathA = parseResult.paths.find((p) =>
			p.nodes.every((n, i) => n === pathA.nodes[i]),
		);
		const parsePathB = parseResult.paths.find((p) =>
			p.nodes.every((n, i) => n === pathB.nodes[i]),
		);
		const degreeSumPathA = degreeSumResult.paths.find((p) =>
			p.nodes.every((n, i) => n === pathA.nodes[i]),
		);
		const degreeSumPathB = degreeSumResult.paths.find((p) =>
			p.nodes.every((n, i) => n === pathB.nodes[i]),
		);

		expect(parsePathA).toBeDefined();
		expect(parsePathB).toBeDefined();
		expect(degreeSumPathA).toBeDefined();
		expect(degreeSumPathB).toBeDefined();

		// PARSE should rank Path B (high-MI specialist path) above Path A (hub-based path)
		const parsePathASalience = parsePathA?.salience ?? 0;
		const parsePathBSalience = parsePathB?.salience ?? 0;
		expect(parsePathBSalience).toBeGreaterThan(parsePathASalience);

		// Degree-sum should do the opposite: rank Path A higher due to Alice's high degree
		const degreeSumPathAScore = degreeSumPathA?.score ?? 0;
		const degreeSumPathBScore = degreeSumPathB?.score ?? 0;
		expect(degreeSumPathAScore).toBeGreaterThan(degreeSumPathBScore);
	});
});
