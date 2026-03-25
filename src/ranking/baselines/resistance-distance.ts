/**
 * Resistance-Distance baseline ranking.
 *
 * Computes effective resistance via Laplacian pseudoinverse (dense, small graphs only).
 * For path scoring: score(P) = 1 / resistance(P.start, P.end), normalised to [0, 1].
 * Size guard: throws if nodeCount > 5000 (O(n^3) complexity).
 */

import type { NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { ExpansionPath } from "../../expansion/types";
import type { BaselineConfig, BaselineResult } from "./types";
import { normaliseAndRank } from "./utils";

/**
 * Compute effective resistance between two nodes via Laplacian pseudoinverse.
 *
 * Resistance = L^+_{s,s} + L^+_{t,t} - 2*L^+_{s,t}
 * where L^+ is the pseudoinverse of the Laplacian matrix.
 *
 * @param graph - Source graph
 * @param source - Source node ID
 * @param target - Target node ID
 * @returns Effective resistance
 */
function computeResistance<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	source: string,
	target: string,
): number {
	const nodes = Array.from(graph.nodeIds());
	const nodeToIdx = new Map<string, number>();
	nodes.forEach((nodeId, idx) => {
		nodeToIdx.set(nodeId, idx);
	});

	const n = nodes.length;

	if (n === 0 || n > 5000) {
		throw new Error(
			`Cannot compute resistance distance: graph too large (${String(n)} nodes). Maximum 5000.`,
		);
	}

	const sourceIdx = nodeToIdx.get(source);
	const targetIdx = nodeToIdx.get(target);

	if (sourceIdx === undefined || targetIdx === undefined) {
		return 0;
	}

	// Build Laplacian matrix: L = D - A
	const L: number[][] = Array.from({ length: n }, () =>
		Array.from({ length: n }, () => 0),
	);

	for (let i = 0; i < n; i++) {
		const nodeId = nodes[i];
		if (nodeId === undefined) continue;

		const degree = graph.degree(nodeId);
		const row = L[i];
		if (row !== undefined) {
			row[i] = degree; // Diagonal
		}

		const neighbours = graph.neighbours(nodeId);
		for (const neighbourId of neighbours) {
			const j = nodeToIdx.get(neighbourId);
			if (j !== undefined && row !== undefined) {
				row[j] = -1; // Off-diagonal
			}
		}
	}

	// Compute pseudoinverse using Moore-Penrose approach (simplified)
	// For small graphs, use LU decomposition with diagonal adjustment
	const Lpinv = pinv(L);

	// Resistance = L^+_{s,s} + L^+_{t,t} - 2*L^+_{s,t}
	const resistance =
		(Lpinv[sourceIdx]?.[sourceIdx] ?? 0) +
		(Lpinv[targetIdx]?.[targetIdx] ?? 0) -
		2 * (Lpinv[sourceIdx]?.[targetIdx] ?? 0);

	// Clamp to positive (numerical stability)
	return Math.max(resistance, 1e-10);
}

/**
 * Compute Moore-Penrose pseudoinverse of a matrix.
 * Simplified implementation for small dense matrices.
 *
 * @param A - Square matrix
 * @returns Pseudoinverse A^+
 */
function pinv(A: number[][]): number[][] {
	const n = A.length;
	if (n === 0) return [];

	// Create copy for singular value computation
	const M = A.map((row) => [...row]);

	// Simplified: add small regularisation to diagonal before inversion
	const epsilon = 1e-10;
	for (let i = 0; i < n; i++) {
		const row = M[i];
		if (row !== undefined) {
			row[i] = (row[i] ?? 0) + epsilon;
		}
	}

	// Gaussian elimination with partial pivoting to compute inverse
	const Minv = gaussianInverse(M);

	return Minv;
}

/**
 * Compute matrix inverse using Gaussian elimination with partial pivoting.
 *
 * @param A - Matrix to invert
 * @returns Inverted matrix
 */
function gaussianInverse(A: number[][]): number[][] {
	const n = A.length;

	// Create augmented matrix [A | I]
	const aug: number[][] = A.map((row, i) => {
		const identity: number[] = Array.from({ length: n }, (_, j) =>
			i === j ? 1 : 0,
		);
		const combined: number[] = [...row, ...identity];
		return combined;
	});

	// Forward elimination with partial pivoting
	for (let col = 0; col < n; col++) {
		// Find pivot
		let maxRow = col;
		for (let row = col + 1; row < n; row++) {
			const currentRow = aug[row];
			const maxRowRef = aug[maxRow];
			if (
				currentRow !== undefined &&
				maxRowRef !== undefined &&
				Math.abs(currentRow[col] ?? 0) > Math.abs(maxRowRef[col] ?? 0)
			) {
				maxRow = row;
			}
		}

		// Swap rows
		const currentCol = aug[col];
		const maxRowAug = aug[maxRow];
		if (currentCol !== undefined && maxRowAug !== undefined) {
			aug[col] = maxRowAug;
			aug[maxRow] = currentCol;
		}

		// Scale pivot row
		const pivotRow = aug[col];
		const pivot = pivotRow?.[col];
		if (pivot === undefined || Math.abs(pivot) < 1e-12) {
			continue; // Skip singular column
		}

		if (pivotRow !== undefined) {
			for (let j = col; j < 2 * n; j++) {
				pivotRow[j] = (pivotRow[j] ?? 0) / pivot;
			}
		}

		// Eliminate below and above
		for (let row = 0; row < n; row++) {
			if (row === col) continue;

			const eliminationRow = aug[row];
			const factor = eliminationRow?.[col] ?? 0;
			if (eliminationRow !== undefined && pivotRow !== undefined) {
				for (let j = col; j < 2 * n; j++) {
					eliminationRow[j] =
						(eliminationRow[j] ?? 0) - factor * (pivotRow[j] ?? 0);
				}
			}
		}
	}

	// Extract inverse (right half of augmented matrix)
	const Ainv: number[][] = [];
	for (let i = 0; i < n; i++) {
		const row = aug[i];
		Ainv[i] = (row?.slice(n) ?? []).map((v) => v);
	}

	return Ainv;
}

/**
 * Rank paths by reciprocal of resistance distance between endpoints.
 *
 * @param graph - Source graph
 * @param paths - Paths to rank
 * @param config - Configuration options
 * @returns Ranked paths (highest conductance first)
 */
export function resistanceDistance<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	paths: readonly ExpansionPath[],
	config?: BaselineConfig,
): BaselineResult {
	const { includeScores = true } = config ?? {};

	if (paths.length === 0) {
		return {
			paths: [],
			method: "resistance-distance",
		};
	}

	// Check graph size
	const nodeCount = Array.from(graph.nodeIds()).length;
	if (nodeCount > 5000) {
		throw new Error(
			`Cannot rank paths: graph too large (${String(nodeCount)} nodes). Resistance distance requires O(n^3) computation; maximum 5000 nodes.`,
		);
	}

	// Score paths by conductance (1 / resistance)
	const scored: { path: ExpansionPath; score: number }[] = paths.map((path) => {
		const source = path.nodes[0];
		const target = path.nodes[path.nodes.length - 1];

		if (source === undefined || target === undefined) {
			return { path, score: 0 };
		}

		const resistance = computeResistance(graph, source, target);
		// Score = conductance = 1 / resistance
		const score = 1 / resistance;
		return { path, score };
	});

	return normaliseAndRank(paths, scored, "resistance-distance", includeScores);
}
