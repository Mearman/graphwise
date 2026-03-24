/**
 * Stratified seed selection — legacy human-defined strata.
 *
 * Requires user-provided field/type classifications. This is included for comparison
 * and for users who have domain metadata.
 *
 * @packageDocumentation
 */

import type { ReadableGraph, NodeId } from "../graph/index";
import type { Seed } from "../schemas/index";

/**
 * Field classification function type.
 * User provides a function that returns the field name for a node.
 */
export type FieldClassifier = (node: {
	id: NodeId;
	type?: string;
}) => string | undefined;

/**
 * Stratum definition for seed pair selection.
 */
export interface StratumDefinition {
	readonly name: string;
	readonly description: string;
	readonly predicate: (
		source: { id: NodeId; type?: string },
		target: { id: NodeId; type?: string },
	) => boolean;
}

/**
 * Stratum with sampled seed pairs.
 */
export interface StratumResult {
	readonly name: string;
	readonly pairs: readonly SeedPair[];
}

/**
 * A seed pair with stratum metadata.
 */
export interface SeedPair {
	readonly source: Seed;
	readonly target: Seed;
	readonly stratum: string;
	readonly sameField: boolean;
}

/**
 * Result of stratified seed selection.
 */
export interface StratifiedResult {
	readonly strata: readonly StratumResult[];
	readonly totalPairs: number;
	readonly errors: readonly Error[];
}

/**
 * Configuration for stratified seed selection.
 */
export interface StratifiedOptions {
	/** Function to classify nodes by field */
	readonly fieldClassifier: FieldClassifier;
	/** Number of pairs to sample per stratum */
	readonly pairsPerStratum?: number;
	/** Random seed for reproducibility */
	readonly rngSeed?: number;
	/** Custom stratum definitions */
	readonly customStrata?: readonly StratumDefinition[];
}

/** Default values */
const DEFAULTS = {
	pairsPerStratum: 10,
	rngSeed: 42,
} as const;

/**
 * Simple seeded pseudo-random number generator using mulberry32.
 */
function createRNG(seed: number): () => number {
	let state = seed >>> 0;
	return (): number => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = Math.imul(state ^ (state >>> 15), state | 1);
		t = (t ^ (t >>> 7)) * (t | 0x61c88647);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

/**
 * Stratified seed selection algorithm.
 *
 * @param graph - The graph to sample seeds from
 * @param options - Configuration options including field classifier
 * @returns Stratified selection result
 *
 * @example
 * ```typescript
 * const graph = new AdjacencyMapGraph();
 * // ... populate graph ...
 *
 * const result = stratified(graph, {
 *   fieldClassifier: (node) => node.type === 'paper' ? 'computer-science' : undefined,
 *   pairsPerStratum: 20,
 * });
 *
 * for (const stratum of result.strata) {
 *   console.log(`${stratum.name}: ${stratum.pairs.length} pairs`);
 * }
 * ```
 */
export function stratified(
	graph: ReadableGraph,
	options: StratifiedOptions,
): StratifiedResult {
	const {
		fieldClassifier,
		pairsPerStratum = DEFAULTS.pairsPerStratum,
		rngSeed = DEFAULTS.rngSeed,
		customStrata,
	} = options;

	const rng = createRNG(rngSeed);
	const strataDefinitions = customStrata ?? [];

	// Collect all nodes with their field classifications
	const nodesWithFields: { id: NodeId; type?: string; field?: string }[] = [];

	for (const nodeId of graph.nodeIds()) {
		const node = graph.getNode(nodeId);
		if (node === undefined) continue;

		const field = fieldClassifier({ id: nodeId, type: node.type });
		if (field === undefined) continue;

		nodesWithFields.push({ id: nodeId, type: node.type, field });
	}

	const errors: Error[] = [];
	const strataResults: StratumResult[] = [];

	// Process each stratum
	for (const stratum of strataDefinitions) {
		const pairs: SeedPair[] = [];
		const eligiblePairs: {
			source: { id: NodeId; type?: string };
			target: { id: NodeId; type?: string };
		}[] = [];

		// Find all node pairs that match this stratum
		for (let i = 0; i < nodesWithFields.length; i++) {
			const source = nodesWithFields[i];
			if (source === undefined) continue;

			for (let j = i + 1; j < nodesWithFields.length; j++) {
				if (j === i) continue;
				const target = nodesWithFields[j];
				if (target === undefined) continue;

				if (stratum.predicate(source, target)) {
					eligiblePairs.push({ source, target });
				}
			}
		}

		// Sample pairs from eligible pairs
		const numToSample = Math.min(pairsPerStratum, eligiblePairs.length);
		for (let i = 0; i < numToSample; i++) {
			const idx = Math.floor(rng() * eligiblePairs.length);
			const pair = eligiblePairs[idx];
			if (pair === undefined) continue;

			const sourceField = fieldClassifier(pair.source);
			const targetField = fieldClassifier(pair.target);

			pairs.push({
				source: { id: pair.source.id },
				target: { id: pair.target.id },
				stratum: stratum.name,
				sameField: sourceField === targetField,
			});
		}

		strataResults.push({
			name: stratum.name,
			pairs,
		});
	}

	// Collect errors for empty strata
	for (const stratum of strataDefinitions) {
		const result = strataResults.find((r) => r.name === stratum.name);
		if (result === undefined || result.pairs.length === 0) {
			errors.push(new Error(`No pairs found for stratum: ${stratum.name}`));
		}
	}

	const totalPairs = strataResults.reduce((sum, r) => sum + r.pairs.length, 0);

	return {
		strata: strataResults,
		totalPairs,
		errors,
	};
}
