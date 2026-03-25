import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import type { NodeData, EdgeData } from "../graph";
import { hae, haeAsync } from "./hae";
import type { Seed } from "./types";
import {
	createLinearChainGraph,
	createDisconnectedGraph,
} from "../__test__/fixtures/graphs/linear-chain";

/** Extended node type used only by the custom type-mapper test. */
interface HAETestNode extends NodeData {
	readonly label: string;
	readonly category?: string;
}

/** Extended edge type used only by the custom type-mapper test. */
interface HAETestEdge extends EdgeData {
	readonly weight: number;
}

describe("hae expansion", () => {
	it("returns empty result for no seeds", () => {
		const graph = createLinearChainGraph();
		const result = hae(graph, []);

		expect(result.paths).toHaveLength(0);
		expect(result.stats.termination).toBe("exhausted");
	});

	it("returns a result object with correct structure", () => {
		const graph = createLinearChainGraph();
		const seeds: Seed[] = [{ id: "A" }, { id: "E" }];

		const result = hae(graph, seeds);

		expect(result).toHaveProperty("paths");
		expect(result).toHaveProperty("sampledNodes");
		expect(result).toHaveProperty("sampledEdges");
		expect(result).toHaveProperty("stats");
	});

	it("sets algorithm name in stats", () => {
		const graph = createLinearChainGraph();
		const result = hae(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.stats.algorithm).toBeDefined();
	});

	it("handles disconnected seeds", () => {
		const graph = createDisconnectedGraph();
		const result = hae(graph, [{ id: "A" }, { id: "B" }]);

		expect(result.paths).toHaveLength(0);
	});

	it("uses default type mapper when none provided", () => {
		const graph = createLinearChainGraph();
		const result = hae(graph, [{ id: "A" }, { id: "E" }]);

		// Should work without error
		expect(result).toHaveProperty("paths");
	});

	it("uses custom type mapper when provided", () => {
		const graph = AdjacencyMapGraph.undirected<HAETestNode, HAETestEdge>();
		graph.addNode({ id: "A", label: "A", category: "TypeX" });
		graph.addNode({ id: "B", label: "B", category: "TypeX" });
		graph.addNode({ id: "C", label: "C", category: "TypeY" });
		graph.addEdge({ source: "A", target: "B", weight: 1 });
		graph.addEdge({ source: "B", target: "C", weight: 1 });

		const isNodeWithCategory = (
			node: unknown,
		): node is { category?: string } => {
			return (
				typeof node === "object" &&
				node !== null &&
				("category" in node || "id" in node)
			);
		};

		const result = hae(graph, [{ id: "A" }, { id: "C" }] as const, {
			typeMapper: (node) => {
				// Custom mapper can access extended properties on HAETestNode
				if (isNodeWithCategory(node)) {
					return node.category ?? "default";
				}
				return "default";
			},
		});

		// Should work with custom mapper
		expect(result).toHaveProperty("paths");
	});

	it("discovers paths between connected seeds", () => {
		const graph = createLinearChainGraph();
		const result = hae(graph, [{ id: "A" }, { id: "E" }]);

		expect(result.paths.length).toBeGreaterThan(0);
	});
});

describe("haeAsync export", () => {
	it("is an async function", () => {
		// Full async equivalence requires PriorityContext refactoring (Phase 4b deferred).
		// The priority function accesses context.graph which is the sentinel in async mode.
		// This test verifies the export exists with the correct async signature.
		expect(typeof haeAsync).toBe("function");
		expect(haeAsync.constructor.name).toBe("AsyncFunction");
	});
});
