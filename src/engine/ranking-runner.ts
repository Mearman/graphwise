/**
 * Ranking runner for PARSE integration.
 *
 * Wraps the graphwise PARSE ranking function to rank discovered paths
 * by geometric mean of edge MI scores.
 */

import type { ReadableGraph, NodeData, EdgeData } from "graphwise/graph";
import type { ExpansionPath } from "graphwise/expansion";
import type { PARSEResult } from "graphwise/ranking";
import type { MIVariantName } from "graphwise/ranking/mi";
import {
	getMIVariant,
	getRankingAlgorithm,
	type RankingAlgorithmConfig,
	type RankingAlgorithmName,
} from "./algorithm-registry";

/**
 * Run PARSE ranking on discovered paths.
 *
 * @param graph - The source graph
 * @param paths - Discovered paths from expansion
 * @param miVariantName - Name of the MI variant to use
 * @returns PARSEResult with ranked paths and statistics
 */
export function runRanking<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	paths: readonly ExpansionPath[],
	miVariantName: MIVariantName,
	rankingAlgorithmName: RankingAlgorithmName = "parse",
): PARSEResult {
	const miInfo = getMIVariant(miVariantName);
	if (miInfo === undefined) {
		throw new Error(`Unknown MI variant: ${miVariantName}`);
	}
	const rankingAlgorithm = getRankingAlgorithm(rankingAlgorithmName);
	if (rankingAlgorithm === undefined) {
		throw new Error(`Unknown ranking algorithm: ${rankingAlgorithmName}`);
	}

	// Create a typed wrapper for the MI function
	const typedMI = (
		g: ReadableGraph<N, E>,
		source: string,
		target: string,
	): number => {
		return miInfo.fn(g, source, target);
	};

	const config: RankingAlgorithmConfig<N, E> = {
		mi: typedMI,
		epsilon: 1e-10,
		includeSalience: true,
	};

	return rankingAlgorithm.run(graph, paths, config);
}
