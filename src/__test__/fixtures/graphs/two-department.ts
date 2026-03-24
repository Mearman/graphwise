/**
 * Two-department organisational structure with single cross-department connection.
 *
 * Structure:
 * - Marketing (5 people): Alice, Bob, Carol, David, Emma
 * - Engineering (5 people): Frank, Grace, Henry, Iris, Jack
 * - Cross-department: One project connector between departments
 *
 * Useful for testing:
 * - Path discovery across dense clusters
 * - Single bottleneck edge properties
 * - Expansion through sparse inter-cluster connections
 */

import { AdjacencyMapGraph } from "../../../graph";
import type { TestGraphFixture } from "../types";

export function createTwoDepartmentFixture(): TestGraphFixture {
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

	// Marketing internal connections: dense mesh-like structure
	// Each person knows 2-3 others within department
	graph.addEdge({ source: "alice", target: "bob", type: "knows", weight: 1 });
	graph.addEdge({
		source: "alice",
		target: "carol",
		type: "knows",
		weight: 1,
	});
	graph.addEdge({ source: "bob", target: "carol", type: "knows", weight: 1 });
	graph.addEdge({ source: "bob", target: "david", type: "knows", weight: 1 });
	graph.addEdge({
		source: "carol",
		target: "david",
		type: "knows",
		weight: 1,
	});
	graph.addEdge({
		source: "carol",
		target: "emma",
		type: "knows",
		weight: 1,
	});
	graph.addEdge({ source: "david", target: "emma", type: "knows", weight: 1 });

	// Engineering internal connections: similarly dense
	graph.addEdge({
		source: "frank",
		target: "grace",
		type: "knows",
		weight: 1,
	});
	graph.addEdge({
		source: "frank",
		target: "henry",
		type: "knows",
		weight: 1,
	});
	graph.addEdge({
		source: "grace",
		target: "henry",
		type: "knows",
		weight: 1,
	});
	graph.addEdge({
		source: "grace",
		target: "iris",
		type: "knows",
		weight: 1,
	});
	graph.addEdge({
		source: "henry",
		target: "iris",
		type: "knows",
		weight: 1,
	});
	graph.addEdge({ source: "iris", target: "jack", type: "knows", weight: 1 });
	graph.addEdge({
		source: "henry",
		target: "jack",
		type: "knows",
		weight: 1,
	});

	// Cross-department: single project connection
	// Carol (marketing) and Frank (engineering) worked on a shared project
	graph.addEdge({
		source: "carol",
		target: "frank",
		type: "collaborated",
		weight: 1,
	});

	return {
		graph,
		seeds: [
			{ id: "alice", role: "source" },
			{ id: "jack", role: "target" },
		],
		metadata: {
			description:
				"Two dense departmental clusters with single cross-department bottleneck",
			marketingDepartment: marketing,
			engineeringDepartment: engineering,
			bottleneckEdge: { source: "carol", target: "frank" },
		},
	};
}
