/**
 * OMNIA — Objective-Maximising Node-pair Integration Algorithm.
 *
 * Full-spectrum ensemble combining blind, informed, and global-structure
 * selectors to optimise multiple seed-quality objectives.
 */

import type { ReadableGraph } from "../graph";
import { crest } from "./crest";
import { crisp } from "./crisp";
import { grasp } from "./grasp";
import {
	communityBridgePairs,
	degreeDiversePairs,
	maxDistancePairs,
	runEnsemble,
	type EnsembleComponent,
	type EnsemblePair,
} from "./hybrid-core";
import { spine } from "./spine";
import { stride } from "./stride";

export interface OmniaOptions {
	readonly nPairs?: number;
	readonly rngSeed?: number;
	readonly blindPriorityBias?: number;
}

export interface OmniaResult {
	readonly pairs: readonly EnsemblePair[];
}

const DEFAULTS = {
	nPairs: 100,
	rngSeed: 42,
	blindPriorityBias: 0.05,
} as const;

export function omnia(
	graph: ReadableGraph,
	options: OmniaOptions = {},
): OmniaResult {
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
			id: "crisp",
			weight: 0.85,
			isBlind: false,
			select: (g, nPairs, rngSeed) => crisp(g, { nPairs, rngSeed }).pairs,
		},
		{
			id: "max_distance",
			weight: 0.9,
			isBlind: false,
			select: maxDistancePairs,
		},
		{
			id: "community_bridge",
			weight: 0.9,
			isBlind: false,
			select: communityBridgePairs,
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
