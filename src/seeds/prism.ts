/**
 * PRISM — Prior-guided Robust Integrated Seed Method.
 *
 * Balanced blind+informed hybrid without oracle privileges.
 */

import type { ReadableGraph } from "../graph";
import { crest } from "./crest";
import { crisp } from "./crisp";
import { grasp } from "./grasp";
import {
	degreeDiversePairs,
	maxDistancePairs,
	runEnsemble,
	type EnsembleComponent,
	type EnsemblePair,
} from "./hybrid-core";
import { spine } from "./spine";
import { stride } from "./stride";

export interface PrismOptions {
	readonly nPairs?: number;
	readonly rngSeed?: number;
	readonly blindPriorityBias?: number;
}

export interface PrismResult {
	readonly pairs: readonly EnsemblePair[];
}

const DEFAULTS = {
	nPairs: 100,
	rngSeed: 42,
	blindPriorityBias: 0.1,
} as const;

export function prism(
	graph: ReadableGraph,
	options: PrismOptions = {},
): PrismResult {
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
			weight: 0.9,
			isBlind: true,
			select: (g, nPairs, rngSeed) => spine(g, { nPairs, rngSeed }).pairs,
		},
		{
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
		},
		{
			id: "degree_diverse",
			weight: 0.7,
			isBlind: true,
			select: degreeDiversePairs,
		},
		{
			id: "max_distance_proxy",
			weight: 0.7,
			isBlind: false,
			select: maxDistancePairs,
		},
		{
			id: "crisp",
			weight: 0.8,
			isBlind: false,
			select: (g, nPairs, rngSeed) => crisp(g, { nPairs, rngSeed }).pairs,
		},
	];

	return {
		pairs: runEnsemble(graph, components, {
			nPairs: config.nPairs,
			rngSeed: config.rngSeed,
			blindPriorityBias: config.blindPriorityBias,
		}),
	};
}
