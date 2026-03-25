import type { NodeData, EdgeData, ReadableGraph } from "graphwise/graph";
import type {
	Seed,
	ExpansionResult,
	ExpansionStats,
} from "graphwise/expansion";
import type { ExpansionAlgorithmName } from "./algorithm-registry";
import {
	getAlgorithm,
	getMIVariant,
	getRankingAlgorithm,
	getSeedSelectionStrategy,
	getSubgraphExtractionStrategy,
} from "./algorithm-registry";
import type { MIVariantName } from "graphwise/ranking/mi";
import type { ExpansionPath } from "graphwise/expansion";
import { runRanking } from "./ranking-runner";
import type {
	MIVariantComparisonEntry,
	RankingAlgorithmComparisonEntry,
	SeedSelectionComparisonEntry,
	SubgraphExtractionComparisonEntry,
} from "../state/comparison-store";
import type {
	RankingAlgorithmName,
	SeedSelectionStrategyName,
	SubgraphExtractionStrategyName,
} from "./algorithm-registry";

export interface ComparisonRunnerEntry {
	readonly algorithmName: ExpansionAlgorithmName;
	readonly result: ExpansionResult;
	readonly stats: ExpansionStats;
}

export interface ComparisonRunnerResult {
	readonly entries: readonly ComparisonRunnerEntry[];
	readonly totalDurationMs: number;
}

export interface MIVariantComparisonRunnerResult {
	readonly entries: readonly MIVariantComparisonEntry[];
	readonly totalDurationMs: number;
}

export interface SeedSelectionComparisonRunnerResult {
	readonly entries: readonly SeedSelectionComparisonEntry[];
	readonly totalDurationMs: number;
}

export interface RankingComparisonRunnerResult {
	readonly entries: readonly RankingAlgorithmComparisonEntry[];
	readonly totalDurationMs: number;
}

export interface SubgraphExtractionComparisonRunnerResult {
	readonly entries: readonly SubgraphExtractionComparisonEntry[];
	readonly totalDurationMs: number;
}

export function runComparison<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	algorithms: readonly ExpansionAlgorithmName[],
): ComparisonRunnerResult {
	const startTime = performance.now();
	const entries: ComparisonRunnerEntry[] = [];

	for (const name of algorithms) {
		const info = getAlgorithm(name);
		if (info === undefined) {
			console.warn(`Unknown algorithm: ${name}`);
			continue;
		}

		try {
			const result = info.run(graph, seeds);
			entries.push({
				algorithmName: name,
				result,
				stats: result.stats,
			});
		} catch (error) {
			console.error(`Algorithm ${name} failed:`, error);
		}
	}

	const totalDurationMs = performance.now() - startTime;

	return {
		entries,
		totalDurationMs,
	};
}

export function runMIVariantComparison<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	paths: readonly ExpansionPath[],
	variants: readonly MIVariantName[],
): MIVariantComparisonRunnerResult {
	const startTime = performance.now();
	const entries: MIVariantComparisonEntry[] = [];

	for (const variant of variants) {
		const info = getMIVariant(variant);
		if (info === undefined) {
			console.warn(`Unknown MI variant: ${variant}`);
			continue;
		}

		try {
			const ranked = runRanking(graph, paths, variant);
			entries.push({
				variant,
				pathsCount: ranked.paths.length,
				meanSalience: ranked.stats.meanSalience,
				durationMs: ranked.stats.durationMs,
			});
		} catch (error) {
			console.error(`MI variant ${variant} failed:`, error);
		}
	}

	return {
		entries,
		totalDurationMs: performance.now() - startTime,
	};
}

export function runRankingComparison<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	paths: readonly ExpansionPath[],
	miVariant: MIVariantName,
	rankingAlgorithms: readonly RankingAlgorithmName[],
): RankingComparisonRunnerResult {
	const startTime = performance.now();
	const entries: RankingAlgorithmComparisonEntry[] = [];

	for (const rankingAlgorithmName of rankingAlgorithms) {
		const rankingInfo = getRankingAlgorithm(rankingAlgorithmName);
		if (rankingInfo === undefined) {
			console.warn(`Unknown ranking algorithm: ${rankingAlgorithmName}`);
			continue;
		}

		try {
			const ranked = runRanking(graph, paths, miVariant, rankingAlgorithmName);
			entries.push({
				rankingAlgorithmName,
				miVariant,
				pathsCount: ranked.paths.length,
				meanSalience: ranked.stats.meanSalience,
				durationMs: ranked.stats.durationMs,
			});
		} catch (error) {
			console.error(`Ranking algorithm ${rankingAlgorithmName} failed:`, error);
		}
	}

	return {
		entries,
		totalDurationMs: performance.now() - startTime,
	};
}

export function runSeedSelectionComparison<
	N extends NodeData,
	E extends EdgeData,
>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	strategies: readonly SeedSelectionStrategyName[],
	algorithmName: ExpansionAlgorithmName,
): SeedSelectionComparisonRunnerResult {
	const startTime = performance.now();
	const entries: SeedSelectionComparisonEntry[] = [];

	const algorithm = getAlgorithm(algorithmName);
	if (algorithm === undefined) {
		console.warn(`Unknown expansion algorithm: ${algorithmName}`);
		return {
			entries,
			totalDurationMs: performance.now() - startTime,
		};
	}

	for (const strategyName of strategies) {
		const strategy = getSeedSelectionStrategy(strategyName);
		if (strategy === undefined) {
			console.warn(`Unknown seed selection strategy: ${strategyName}`);
			continue;
		}

		try {
			const derivedSeeds = strategy.run(graph, seeds);
			const result = algorithm.run(graph, derivedSeeds);
			const seedCount = Math.max(derivedSeeds.length, 1);
			entries.push({
				strategyName,
				algorithmName,
				derivedSeeds,
				stats: result.stats,
				normalised: {
					nodesVisitedPerSeed: result.stats.nodesVisited / seedCount,
					edgesTraversedPerSeed: result.stats.edgesTraversed / seedCount,
					pathsFoundPerSeed: result.stats.pathsFound / seedCount,
					iterationsPerSeed: result.stats.iterations / seedCount,
				},
			});
		} catch (error) {
			console.error(`Seed strategy ${strategyName} failed:`, error);
		}
	}

	return {
		entries,
		totalDurationMs: performance.now() - startTime,
	};
}

export function runSubgraphExtractionComparison<
	N extends NodeData,
	E extends EdgeData,
>(
	graph: ReadableGraph<N, E>,
	paths: readonly ExpansionPath[],
	strategies: readonly SubgraphExtractionStrategyName[],
	miVariant: MIVariantName,
): SubgraphExtractionComparisonRunnerResult {
	const startTime = performance.now();
	const entries: SubgraphExtractionComparisonEntry[] = [];
	const baselinePathCount = Math.max(paths.length, 1);

	for (const strategyName of strategies) {
		const strategy = getSubgraphExtractionStrategy(strategyName);
		if (strategy === undefined) {
			console.warn(`Unknown subgraph extraction strategy: ${strategyName}`);
			continue;
		}

		try {
			const entryStartTime = performance.now();
			const extractedPaths = strategy.run(paths);
			const ranked = runRanking(graph, extractedPaths, miVariant);
			const totalDurationMs = performance.now() - entryStartTime;

			entries.push({
				strategyName,
				extractedPathsCount: extractedPaths.length,
				retentionRatio: extractedPaths.length / baselinePathCount,
				rankedPathsCount: ranked.paths.length,
				meanSalience: ranked.stats.meanSalience,
				rankingDurationMs: ranked.stats.durationMs,
				totalDurationMs,
			});
		} catch (error) {
			console.error(
				`Subgraph extraction strategy ${strategyName} failed:`,
				error,
			);
		}
	}

	return {
		entries,
		totalDurationMs: performance.now() - startTime,
	};
}
