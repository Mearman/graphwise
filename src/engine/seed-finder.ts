import { bfs, bfsWithPath } from "graphwise/traversal";
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
 *
 * Enforces a minimum BFS depth of `floor(sqrt(nodeCount))` (minimum 2) so
 * seeds are meaningfully spread apart relative to the graph size. Falls back
 * to the furthest reachable node if no node meets the minimum depth.
 *
 * Returns null if the graph has no connected pair.
 */
export function findValidSeeds(
	graph: AdjacencyMapGraph,
): readonly Seed[] | null {
	const minDepth = Math.max(2, Math.floor(Math.sqrt(graph.nodeCount)));

	for (const sourceId of graph.nodeIds()) {
		const atMinDepth: string[] = [];
		let furthest: string | null = null;
		let furthestDepth = 0;

		for (const { node, depth } of bfsWithPath(graph, sourceId)) {
			if (node === sourceId) continue;
			if (depth >= minDepth) {
				atMinDepth.push(node);
			}
			if (depth > furthestDepth) {
				furthestDepth = depth;
				furthest = node;
			}
		}

		const candidates =
			atMinDepth.length > 0 ? atMinDepth : furthest !== null ? [furthest] : [];
		const targetId =
			candidates[Math.floor(candidates.length * 0.67)] ??
			candidates[candidates.length - 1] ??
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
