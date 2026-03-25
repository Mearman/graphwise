import type { NodeData, EdgeData, ReadableGraph } from "graphwise/graph";
import type {
	Seed,
	ExpansionResult,
	ExpansionStats,
} from "graphwise/expansion";
import type { ExpansionAlgorithmName } from "./algorithm-registry";
import { getAlgorithm, getMIVariant } from "./algorithm-registry";
import type { MIVariantName } from "graphwise/ranking/mi";
import type { ExpansionPath } from "graphwise/expansion";
import { runRanking } from "./ranking-runner";
import type { MIVariantComparisonEntry } from "../state/comparison-store";

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
