/**
 * Motif enumeration algorithms.
 *
 * Motifs are small recurring subgraph patterns. This module provides
 * enumeration and counting of motifs of size 3 and 4.
 */

import type { NodeId, NodeData, EdgeData, ReadableGraph } from "../graph";

/**
 * Result of a motif census operation.
 */
export interface MotifCensus {
	/** Map from motif type identifier to count */
	readonly counts: ReadonlyMap<string, number>;
	/** Optional map from motif type to node instances */
	readonly instances?: ReadonlyMap<string, readonly NodeId[][]>;
}

/**
 * Canonicalise an edge pattern for hashing.
 *
 * Returns a canonical string representation of a small graph pattern.
 */
function canonicalisePattern(
	nodeCount: number,
	edges: readonly (readonly [number, number])[],
): string {
	// For small graphs (3-4 nodes), we enumerate all permutations
	// and return the lexicographically smallest edge list

	const permutations = getPermutations(nodeCount);
	let minPattern: string | null = null;

	for (const perm of permutations) {
		// Transform edges according to permutation
		const transformedEdges = edges
			.map(([u, v]) => {
				const pu = perm[u] ?? -1;
				const pv = perm[v] ?? -1;
				if (pu < 0 || pv < 0) {
					return undefined;
				}
				return pu < pv
					? `${String(pu)}-${String(pv)}`
					: `${String(pv)}-${String(pu)}`;
			})
			.filter((edge): edge is string => edge !== undefined)
			.sort()
			.join(",");

		if (minPattern === null || transformedEdges < minPattern) {
			minPattern = transformedEdges;
		}
	}

	return minPattern ?? "";
}

/**
 * Generate all permutations of [0, n-1].
 */
function getPermutations(n: number): number[][] {
	if (n === 0) return [[]];
	if (n === 1) return [[0]];

	const result: number[][] = [];
	const arr = Array.from({ length: n }, (_, i) => i);

	function permute(start: number): void {
		if (start === n - 1) {
			result.push([...arr]);
			return;
		}

		for (let i = start; i < n; i++) {
			const startVal = arr[start];
			const iVal = arr[i];
			if (startVal === undefined || iVal === undefined) continue;
			arr[start] = iVal;
			arr[i] = startVal;
			permute(start + 1);
			arr[start] = startVal;
			arr[i] = iVal;
		}
	}

	permute(0);
	return result;
}

/**
 * Enumerate all 3-node motifs in the graph.
 *
 * A 3-node motif (triad) can be one of 4 isomorphism classes for undirected graphs:
 * - Empty: no edges
 * - 1-edge: single edge
 * - 2-star: two edges sharing a node (path of length 2)
 * - Triangle: three edges (complete graph K3)
 *
 * For directed graphs, there are 16 isomorphism classes.
 *
 * @param graph - The source graph
 * @param includeInstances - Whether to include node instances in the result
 * @returns Motif census with counts and optionally instances
 */
function enumerate3NodeMotifs<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	includeInstances: boolean,
): MotifCensus {
	const counts = new Map<string, number>();
	const instances = includeInstances
		? new Map<string, NodeId[][]>()
		: undefined;

	const nodeList = [...graph.nodeIds()];
	const n = nodeList.length;

	// Iterate over all triples of nodes
	for (let i = 0; i < n; i++) {
		const ni = nodeList[i];
		if (ni === undefined) continue;
		for (let j = i + 1; j < n; j++) {
			const nj = nodeList[j];
			if (nj === undefined) continue;
			for (let k = j + 1; k < n; k++) {
				const nk = nodeList[k];
				if (nk === undefined) continue;

				const nodes: [NodeId, NodeId, NodeId] = [ni, nj, nk];
				const edges: [number, number][] = [];

				// Check all 3 possible edges
				const edgeChecks: [number, number][] = [
					[0, 1],
					[0, 2],
					[1, 2],
				];

				for (const [u, v] of edgeChecks) {
					const nu = nodes[u];
					const nv = nodes[v];
					if (nu === undefined || nv === undefined) continue;

					if (graph.getEdge(nu, nv) !== undefined) {
						edges.push([u, v]);
					} else if (!graph.directed && graph.getEdge(nv, nu) !== undefined) {
						edges.push([u, v]);
					} else if (graph.directed && graph.getEdge(nv, nu) !== undefined) {
						// For directed graphs, store directed edge
						edges.push([v, u]);
					}
				}

				const pattern = canonicalisePattern(3, edges);
				const count = counts.get(pattern) ?? 0;
				counts.set(pattern, count + 1);

				if (includeInstances && instances !== undefined) {
					if (!instances.has(pattern)) {
						instances.set(pattern, []);
					}
					const patternInstances = instances.get(pattern);
					if (patternInstances !== undefined) {
						patternInstances.push([ni, nj, nk]);
					}
				}
			}
		}
	}

	if (instances !== undefined) {
		return { counts, instances };
	}
	return { counts };
}

/**
 * Enumerate all 4-node motifs in the graph.
 *
 * A 4-node motif can be one of 11 isomorphism classes for undirected graphs
 * (ranging from empty to complete K4), or many more for directed graphs.
 *
 * @param graph - The source graph
 * @param includeInstances - Whether to include node instances in the result
 * @returns Motif census with counts and optionally instances
 */
function enumerate4NodeMotifs<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	includeInstances: boolean,
): MotifCensus {
	const counts = new Map<string, number>();
	const instances = includeInstances
		? new Map<string, NodeId[][]>()
		: undefined;

	const nodeList = [...graph.nodeIds()];
	const n = nodeList.length;

	// Iterate over all quadruples of nodes
	for (let i = 0; i < n; i++) {
		const ni = nodeList[i];
		if (ni === undefined) continue;
		for (let j = i + 1; j < n; j++) {
			const nj = nodeList[j];
			if (nj === undefined) continue;
			for (let k = j + 1; k < n; k++) {
				const nk = nodeList[k];
				if (nk === undefined) continue;
				for (let l = k + 1; l < n; l++) {
					const nl = nodeList[l];
					if (nl === undefined) continue;

					const nodes: [NodeId, NodeId, NodeId, NodeId] = [ni, nj, nk, nl];
					const edges: [number, number][] = [];

					// Check all 6 possible edges
					const edgeChecks: [number, number][] = [
						[0, 1],
						[0, 2],
						[0, 3],
						[1, 2],
						[1, 3],
						[2, 3],
					];

					for (const [u, v] of edgeChecks) {
						const nu = nodes[u];
						const nv = nodes[v];
						if (nu === undefined || nv === undefined) continue;

						if (graph.getEdge(nu, nv) !== undefined) {
							edges.push([u, v]);
						} else if (!graph.directed && graph.getEdge(nv, nu) !== undefined) {
							edges.push([u, v]);
						} else if (graph.directed && graph.getEdge(nv, nu) !== undefined) {
							// For directed graphs, store directed edge
							edges.push([v, u]);
						}
					}

					const pattern = canonicalisePattern(4, edges);
					const count = counts.get(pattern) ?? 0;
					counts.set(pattern, count + 1);

					if (includeInstances && instances !== undefined) {
						if (!instances.has(pattern)) {
							instances.set(pattern, []);
						}
						const patternInstances = instances.get(pattern);
						if (patternInstances !== undefined) {
							patternInstances.push([ni, nj, nk, nl]);
						}
					}
				}
			}
		}
	}

	if (instances !== undefined) {
		return { counts, instances };
	}
	return { counts };
}

/**
 * Human-readable names for common 3-node motifs.
 */
const MOTIF_3_NAMES: ReadonlyMap<string, string> = new Map([
	["", "empty"], // No edges
	["0-1", "1-edge"], // Single edge
	["0-1,0-2", "2-star"], // Path of length 2 (V-shape)
	["0-1,1-2", "path-3"], // Path of length 2 (alternative)
	["0-1,0-2,1-2", "triangle"], // Complete K3
]);

/**
 * Human-readable names for common 4-node motifs.
 */
const MOTIF_4_NAMES: ReadonlyMap<string, string> = new Map([
	["", "empty"],
	["0-1", "1-edge"],
	["0-1,0-2", "2-star"],
	["0-1,0-2,0-3", "3-star"],
	["0-1,0-2,1-2", "triangle"], // K3 + isolated
	["0-1,0-2,1-2,2-3", "paw"], // Triangle with tail
	["0-1,0-2,2-3", "path-4"], // Path of length 3
	["0-1,0-2,1-3,2-3", "4-cycle"], // Cycle C4
	["0-1,0-2,1-2,0-3,1-3", "diamond"], // K4 minus one edge
	["0-1,0-2,0-3,1-2,1-3,2-3", "K4"], // Complete graph
]);

/**
 * Enumerate motifs of a given size in the graph.
 *
 * This function counts all occurrences of each distinct motif type
 * (isomorphism class) in the graph. For graphs with many nodes,
 * 4-motif enumeration can be expensive (O(n^4) worst case).
 *
 * @param graph - The source graph
 * @param size - Motif size (3 or 4 nodes)
 * @returns Motif census with counts per motif type
 *
 * @example
 * ```typescript
 * // Count all triangles and other 3-node patterns
 * const census3 = enumerateMotifs(graph, 3);
 * console.log(`Triangles: ${census3.counts.get('0-1,0-2,1-2')}`);
 *
 * // Count 4-node patterns
 * const census4 = enumerateMotifs(graph, 4);
 * ```
 */
export function enumerateMotifs<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	size: 3 | 4,
): MotifCensus {
	// Don't include instances by default for efficiency
	return size === 3
		? enumerate3NodeMotifs(graph, false)
		: enumerate4NodeMotifs(graph, false);
}

/**
 * Enumerate motifs with optional instance tracking.
 *
 * @param graph - The source graph
 * @param size - Motif size (3 or 4 nodes)
 * @param includeInstances - Whether to include node instances
 * @returns Motif census with counts and optionally instances
 */
export function enumerateMotifsWithInstances<
	N extends NodeData,
	E extends EdgeData,
>(
	graph: ReadableGraph<N, E>,
	size: 3 | 4,
	includeInstances: boolean,
): MotifCensus {
	return size === 3
		? enumerate3NodeMotifs(graph, includeInstances)
		: enumerate4NodeMotifs(graph, includeInstances);
}

/**
 * Get a human-readable name for a motif pattern.
 *
 * @param pattern - The canonical pattern string
 * @param size - Motif size (3 or 4 nodes)
 * @returns A human-readable name, or the pattern itself if unknown
 */
export function getMotifName(pattern: string, size: 3 | 4): string {
	const names = size === 3 ? MOTIF_3_NAMES : MOTIF_4_NAMES;
	return names.get(pattern) ?? pattern;
}
