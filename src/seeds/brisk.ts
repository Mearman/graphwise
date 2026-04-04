/**
 * BRISK — Blind Robust Integrated Seed sKetch.
 *
 * Blind-priority ensemble that combines STRIDE, CREST, SPINE, GRASP,
 * and degree-diversity sampling.
 */

import type { ReadableGraph } from "../graph";
import { crest } from "./crest";
import { grasp } from "./grasp";
import {
	degreeDiversePairs,
	runEnsemble,
	type EnsembleComponent,
	type EnsemblePair,
} from "./hybrid-core";
import { spine } from "./spine";
import { stride } from "./stride";

export interface BriskOptions {
	/** Number of seed pairs to select (default: 100) */
	readonly nPairs?: number;
	/** RNG seed for reproducibility (default: 42) */
	readonly rngSeed?: number;
	/** Blind vote bonus multiplier (default: 0.1) */
	readonly blindPriorityBias?: number;
	/** Whether to include GRASP in the ensemble (default: true) */
	readonly includeGrasp?: boolean;
}

export interface BriskResult {
	/** Selected seed pairs */
	readonly pairs: readonly EnsemblePair[];
}

const DEFAULTS = {
	nPairs: 100,
	rngSeed: 42,
	blindPriorityBias: 0.1,
	includeGrasp: true,
} as const;

export function brisk(
	graph: ReadableGraph,
	options: BriskOptions = {},
): BriskResult {
	const config = { ...DEFAULTS, ...options };

	const components: EnsembleComponent[] = [
		{
			id: "stride",
			weight: 1.0,
			isBlind: true,
			select: (g, nPairs, rngSeed) => stride(g, { nPairs, rngSeed }).pairs,
		},
		{
			id: "crest",
			weight: 1.0,
			isBlind: true,
			select: (g, nPairs, rngSeed) => crest(g, { nPairs, rngSeed }).pairs,
		},
		{
			id: "spine",
			weight: 0.95,
			isBlind: true,
			select: (g, nPairs, rngSeed) => spine(g, { nPairs, rngSeed }).pairs,
		},
		{
			id: "degree_diverse",
			weight: 0.6,
			isBlind: true,
			select: degreeDiversePairs,
		},
	];

	if (config.includeGrasp) {
		components.push({
			id: "grasp",
			weight: 0.8,
			isBlind: true,
			select: (g, nPairs, rngSeed) => {
				const k = Math.min(24, Math.max(8, Math.round(Math.sqrt(g.nodeCount))));
				return grasp(g, {
					rngSeed,
					nClusters: k,
					pairsPerCluster: Math.max(2, Math.ceil(nPairs / Math.max(1, k))),
					sampleSize: Math.min(20_000, Math.max(2000, g.nodeCount * 20)),
				}).pairs;
			},
		});
	}

	return {
		pairs: runEnsemble(graph, components, {
			nPairs: config.nPairs,
			rngSeed: config.rngSeed,
			blindPriorityBias: config.blindPriorityBias,
		}),
	};
}
