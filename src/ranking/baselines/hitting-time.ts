/**
 * Hitting-time ranking baseline.
 *
 * Ranks paths by the inverse of the expected number of steps
 * in a random walk from source to target.
 *
 * Score = 1 / hittingTime(source, target)
 *
 * Two computation modes:
 * - Approximate: Monte Carlo random walk simulation (default, efficient for large graphs)
 * - Exact: Fundamental matrix approach (for small graphs)
 * - Auto: Automatic mode selection (switches at ~100 nodes)
 */

import type { NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { ExpansionPath } from "../../expansion/types";
import type { BaselineConfig, BaselineResult } from "./types";
import { normaliseAndRank } from "./utils";

/**
 * Configuration for hitting-time ranking.
 */
interface HittingTimeConfig extends BaselineConfig {
	/** Computation mode: "exact", "approximate", or "auto" (default: "auto") */
	readonly mode?: "exact" | "approximate" | "auto";
	/** Number of Monte Carlo walks for approximate mode (default: 1000) */
	readonly walks?: number;
	/** Maximum steps per walk (default: 10000) */
	readonly maxSteps?: number;
	/** Random seed for reproducibility (default: 42) */
	readonly seed?: number;
}

/**
 * Seeded deterministic random number generator (LCG).
 * Suitable for reproducible random walk simulation.
 */
class SeededRNG {
	private state: number;

	constructor(seed: number) {
		this.state = seed;
	}

	/**
	 * Generate next pseudorandom value in [0, 1).
	 */
	next(): number {
		// Linear congruential generator: standard MINSTD parameters
		this.state = (this.state * 1103515245 + 12345) & 0x7fffffff;
		return this.state / 0x7fffffff;
	}
}

/**
 * Compute hitting time via Monte Carlo random walk simulation.
 *
 * @param graph - Source graph
 * @param source - Source node ID
 * @param target - Target node ID
 * @param walks - Number of walks to simulate
 * @param maxSteps - Maximum steps per walk
 * @param rng - Seeded RNG instance
 * @returns Average hitting time across walks
 */
function computeHittingTimeApproximate<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	source: string,
	target: string,
	walks: number,
	maxSteps: number,
	rng: SeededRNG,
): number {
	if (source === target) {
		return 0; // Hitting time from a node to itself is 0
	}

	let totalSteps = 0;
	let successfulWalks = 0;

	for (let w = 0; w < walks; w++) {
		let current: string = source;
		let steps = 0;

		while (current !== target && steps < maxSteps) {
			const neighbours = Array.from(graph.neighbours(current));
			if (neighbours.length === 0) {
				// Stuck in sink node
				break;
			}

			// Uniformly choose next neighbour
			const nextIdx = Math.floor(rng.next() * neighbours.length);
			const nextNode = neighbours[nextIdx];
			if (nextNode === undefined) {
				break;
			}
			current = nextNode;
			steps++;
		}

		if (current === target) {
			totalSteps += steps;
			successfulWalks++;
		}
	}

	// Return average if any walks succeeded
	if (successfulWalks > 0) {
		return totalSteps / successfulWalks;
	}

	// Return maxSteps as estimate if no walks succeeded
	return maxSteps;
}

/**
 * Compute hitting time via exact fundamental matrix method.
 *
 * For small graphs, computes exact expected hitting times using
 * the fundamental matrix of the random walk.
 *
 * @param graph - Source graph
 * @param source - Source node ID
 * @param target - Target node ID
 * @returns Exact hitting time (or approximation if convergence fails)
 */
function computeHittingTimeExact<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	source: string,
	target: string,
): number {
	if (source === target) {
		return 0;
	}

	const nodes = Array.from(graph.nodeIds());
	const nodeToIdx = new Map<string, number>();
	nodes.forEach((nodeId, idx) => {
		nodeToIdx.set(nodeId, idx);
	});

	const n = nodes.length;
	const sourceIdx = nodeToIdx.get(source);
	const targetIdx = nodeToIdx.get(target);

	if (sourceIdx === undefined || targetIdx === undefined) {
		return 0;
	}

	// Build transition matrix P with absorbing target
	const P: number[][] = [];
	for (let i = 0; i < n; i++) {
		const row: number[] = [];
		for (let j = 0; j < n; j++) {
			row[j] = 0;
		}
		P[i] = row;
	}

	for (const nodeId of nodes) {
		const idx = nodeToIdx.get(nodeId);
		if (idx === undefined) continue;

		const pRow = P[idx];
		if (pRow === undefined) continue;

		if (idx === targetIdx) {
			// Target is absorbing state
			pRow[idx] = 1;
		} else {
			const neighbours = Array.from(graph.neighbours(nodeId));
			const degree = neighbours.length;

			if (degree > 0) {
				for (const neighbourId of neighbours) {
					const nIdx = nodeToIdx.get(neighbourId);
					if (nIdx !== undefined) {
						pRow[nIdx] = 1 / degree;
					}
				}
			}
		}
	}

	// Compute fundamental matrix N = (I - Q)^(-1)
	// where Q is the submatrix of P excluding the absorbing state
	const transientIndices: number[] = [];

	for (let i = 0; i < n; i++) {
		if (i !== targetIdx) {
			transientIndices.push(i);
		}
	}

	const m = transientIndices.length;
	const Q: number[][] = [];
	for (let i = 0; i < m; i++) {
		const row: number[] = [];
		for (let j = 0; j < m; j++) {
			row[j] = 0;
		}
		Q[i] = row;
	}

	for (let i = 0; i < m; i++) {
		const qRow = Q[i];
		if (qRow === undefined) continue;
		const origI = transientIndices[i];
		if (origI === undefined) continue;
		const pRow = P[origI];
		if (pRow === undefined) continue;

		for (let j = 0; j < m; j++) {
			const origJ = transientIndices[j];
			if (origJ === undefined) continue;
			qRow[j] = pRow[origJ] ?? 0;
		}
	}

	// Compute I - Q
	const IMQ: number[][] = [];
	for (let i = 0; i < m; i++) {
		const row: number[] = [];
		for (let j = 0; j < m; j++) {
			row[j] = i === j ? 1 : 0;
		}
		IMQ[i] = row;
	}

	for (let i = 0; i < m; i++) {
		const imqRow = IMQ[i];
		if (imqRow === undefined) continue;
		const qRow = Q[i];

		for (let j = 0; j < m; j++) {
			const qVal = qRow?.[j] ?? 0;
			imqRow[j] = (i === j ? 1 : 0) - qVal;
		}
	}

	// Invert (I - Q) using Gaussian elimination
	const N = invertMatrix(IMQ);

	if (N === null) {
		// Fallback if inversion fails
		return 1;
	}

	// Hitting time from source to target = sum of row corresponding to source
	const sourceTransientIdx = transientIndices.indexOf(sourceIdx);
	if (sourceTransientIdx < 0) {
		return 0; // Source is already the target
	}

	let hittingTime = 0;
	const row = N[sourceTransientIdx];
	if (row !== undefined) {
		for (const val of row) {
			hittingTime += val;
		}
	}

	return hittingTime;
}

/**
 * Invert a square matrix using Gaussian elimination with partial pivoting.
 *
 * @param matrix - Input matrix (n × n)
 * @returns Inverted matrix, or null if singular
 */
function invertMatrix(matrix: number[][]): number[][] | null {
	const n = matrix.length;
	const aug: number[][] = [];

	// Create augmented matrix [A | I]
	for (let i = 0; i < n; i++) {
		const row: number[] = [];
		const matRow = matrix[i];

		for (let j = 0; j < n; j++) {
			row[j] = matRow?.[j] ?? 0;
		}
		for (let j = 0; j < n; j++) {
			row[n + j] = i === j ? 1 : 0;
		}
		aug[i] = row;
	}

	// Forward elimination with partial pivoting
	for (let col = 0; col < n; col++) {
		// Find pivot
		let pivotRow = col;
		const pivotCol = aug[pivotRow];
		if (pivotCol === undefined) return null;

		for (let row = col + 1; row < n; row++) {
			const currRowVal = aug[row]?.[col] ?? 0;
			const pivotRowVal = pivotCol[col] ?? 0;
			if (Math.abs(currRowVal) > Math.abs(pivotRowVal)) {
				pivotRow = row;
			}
		}

		// Check for singular matrix
		const augPivot = aug[pivotRow];
		if (augPivot === undefined || Math.abs(augPivot[col] ?? 0) < 1e-10) {
			return null;
		}

		// Swap rows
		[aug[col], aug[pivotRow]] = [aug[pivotRow] ?? [], aug[col] ?? []];

		// Scale pivot row
		const scaledPivotRow = aug[col];
		if (scaledPivotRow === undefined) return null;
		const pivot = scaledPivotRow[col] ?? 1;

		for (let j = 0; j < 2 * n; j++) {
			scaledPivotRow[j] = (scaledPivotRow[j] ?? 0) / pivot;
		}

		// Eliminate column below pivot
		for (let row = col + 1; row < n; row++) {
			const currRow = aug[row];
			if (currRow === undefined) continue;
			const factor = currRow[col] ?? 0;

			for (let j = 0; j < 2 * n; j++) {
				currRow[j] = (currRow[j] ?? 0) - factor * (scaledPivotRow[j] ?? 0);
			}
		}
	}

	// Back substitution
	for (let col = n - 1; col > 0; col--) {
		const colRow = aug[col];
		if (colRow === undefined) return null;

		for (let row = col - 1; row >= 0; row--) {
			const currRow = aug[row];
			if (currRow === undefined) continue;

			const factor = currRow[col] ?? 0;
			for (let j = 0; j < 2 * n; j++) {
				currRow[j] = (currRow[j] ?? 0) - factor * (colRow[j] ?? 0);
			}
		}
	}

	// Extract inverse from augmented matrix
	const inv: number[][] = [];
	for (let i = 0; i < n; i++) {
		const row: number[] = [];
		for (let j = 0; j < n; j++) {
			row[j] = 0;
		}
		inv[i] = row;
	}

	for (let i = 0; i < n; i++) {
		const invRow = inv[i];
		if (invRow === undefined) continue;
		const augRow = aug[i];
		if (augRow === undefined) continue;

		for (let j = 0; j < n; j++) {
			invRow[j] = augRow[n + j] ?? 0;
		}
	}

	return inv;
}

/**
 * Rank paths by inverse hitting time between endpoints.
 *
 * @param graph - Source graph
 * @param paths - Paths to rank
 * @param config - Configuration options
 * @returns Ranked paths (highest inverse hitting time first)
 */
export function hittingTime<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	paths: readonly ExpansionPath[],
	config?: HittingTimeConfig,
): BaselineResult {
	const {
		includeScores = true,
		mode = "auto",
		walks = 1000,
		maxSteps = 10000,
		seed = 42,
	} = config ?? {};

	if (paths.length === 0) {
		return {
			paths: [],
			method: "hitting-time",
		};
	}

	// Choose computation mode
	const nodeCount = Array.from(graph.nodeIds()).length;
	const actualMode =
		mode === "auto" ? (nodeCount < 100 ? "exact" : "approximate") : mode;

	const rng = new SeededRNG(seed);

	// Score paths by inverse hitting time between endpoints
	const scored: { path: ExpansionPath; score: number }[] = paths.map((path) => {
		const source = path.nodes[0];
		const target = path.nodes[path.nodes.length - 1];

		if (source === undefined || target === undefined) {
			return { path, score: 0 };
		}

		const ht =
			actualMode === "exact"
				? computeHittingTimeExact(graph, source, target)
				: computeHittingTimeApproximate(
						graph,
						source,
						target,
						walks,
						maxSteps,
						rng,
					);

		// Use inverse: shorter hitting time = higher score
		const score = ht > 0 ? 1 / ht : 0;
		return { path, score };
	});

	// Guard against non-finite scores before normalisation
	const maxScore = Math.max(...scored.map((s) => s.score));
	if (!Number.isFinite(maxScore)) {
		return {
			paths: paths.map((path) => ({ ...path, score: 0 })),
			method: "hitting-time",
		};
	}

	return normaliseAndRank(paths, scored, "hitting-time", includeScores);
}
