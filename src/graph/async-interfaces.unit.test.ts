import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "./adjacency-map";
import { wrapAsync } from "../__test__/fixtures/wrap-async";
import type { NodeData, EdgeData } from "./types";

interface TestNode extends NodeData {
	readonly id: string;
	readonly label: string;
}

interface TestEdge extends EdgeData {
	readonly source: string;
	readonly target: string;
	readonly weight: number;
}

function createTestGraph(): AdjacencyMapGraph<TestNode, TestEdge> {
	const g = AdjacencyMapGraph.undirected<TestNode, TestEdge>();
	g.addNode({ id: "A", label: "A" });
	g.addNode({ id: "B", label: "B" });
	g.addNode({ id: "C", label: "C" });
	g.addEdge({ source: "A", target: "B", weight: 1 });
	g.addEdge({ source: "B", target: "C", weight: 2 });
	return g;
}

describe("AsyncReadableGraph via wrapAsync", () => {
	it("preserves directed flag", () => {
		const g = createTestGraph();
		const ag = wrapAsync(g);
		expect(ag.directed).toBe(g.directed);
	});

	it("resolves nodeCount", async () => {
		const g = createTestGraph();
		const ag = wrapAsync(g);
		expect(await ag.nodeCount).toBe(g.nodeCount);
	});

	it("resolves edgeCount", async () => {
		const g = createTestGraph();
		const ag = wrapAsync(g);
		expect(await ag.edgeCount).toBe(g.edgeCount);
	});

	it("resolves hasNode", async () => {
		const g = createTestGraph();
		const ag = wrapAsync(g);
		expect(await ag.hasNode("A")).toBe(true);
		expect(await ag.hasNode("Z")).toBe(false);
	});

	it("resolves getNode", async () => {
		const g = createTestGraph();
		const ag = wrapAsync(g);
		const node = await ag.getNode("A");
		expect(node?.id).toBe("A");
		expect(node?.label).toBe("A");
		expect(await ag.getNode("Z")).toBeUndefined();
	});

	it("iterates nodeIds", async () => {
		const g = createTestGraph();
		const ag = wrapAsync(g);
		const ids: string[] = [];
		for await (const id of ag.nodeIds()) ids.push(id);
		expect(ids.sort()).toEqual(["A", "B", "C"]);
	});

	it("iterates neighbours", async () => {
		const g = createTestGraph();
		const ag = wrapAsync(g);
		const neighbours: string[] = [];
		for await (const n of ag.neighbours("B")) neighbours.push(n);
		expect(neighbours.sort()).toEqual(["A", "C"]);
	});

	it("resolves degree", async () => {
		const g = createTestGraph();
		const ag = wrapAsync(g);
		expect(await ag.degree("B")).toBe(2);
		expect(await ag.degree("A")).toBe(1);
	});

	it("resolves getEdge", async () => {
		const g = createTestGraph();
		const ag = wrapAsync(g);
		const edge = await ag.getEdge("A", "B");
		expect(edge).toBeDefined();
		expect(edge?.weight).toBe(1);
		expect(await ag.getEdge("A", "C")).toBeUndefined();
	});

	it("iterates edges", async () => {
		const g = createTestGraph();
		const ag = wrapAsync(g);
		const edges: EdgeData[] = [];
		for await (const e of ag.edges()) edges.push(e);
		expect(edges.length).toBe(g.edgeCount);
	});
});
