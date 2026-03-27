import { bfs } from "graphwise/traversal";
import type { AdjacencyMapGraph } from "graphwise/graph";
import type { Seed } from "graphwise/expansion";

/**
 * Returns true if there is a path from seeds[0] to seeds[1] in the graph.
 * Returns false if fewer than 2 seeds are provided.
 */
export function seedsAreValid(
	graph: AdjacencyMapGraph,
	seeds: readonly Seed[],
): boolean {
	if (seeds.length < 2) return false;
	const source = seeds[0];
	const target = seeds[1];
	if (source === undefined || target === undefined) return false;
	if (!graph.hasNode(source.id) || !graph.hasNode(target.id)) return false;
	for (const nodeId of bfs(graph, source.id)) {
		if (nodeId === target.id) return true;
	}
	return false;
}

/**
 * Finds a pair of nodes with a path between them and returns them as seeds.
 * Picks the source as the first node that has any reachable neighbours, and
 * the target as the node ~2/3 through BFS order for a meaningful spread.
 * Returns null if the graph has no connected pair.
 */
export function findValidSeeds(
	graph: AdjacencyMapGraph,
): readonly Seed[] | null {
	for (const sourceId of graph.nodeIds()) {
		const reachable: string[] = [];
		for (const nodeId of bfs(graph, sourceId)) {
			if (nodeId !== sourceId) {
				reachable.push(nodeId);
			}
		}
		const targetId =
			reachable[Math.floor(reachable.length * 0.67)] ??
			reachable[reachable.length - 1] ??
			null;
		if (targetId !== null) {
			return [
				{ id: sourceId, role: "source" },
				{ id: targetId, role: "target" },
			];
		}
	}
	return null;
}
