import type { NodeData, EdgeData, ReadableGraph } from "graphwise/graph";
import type {
	Seed,
	ExpansionResult,
	ExpansionStats,
} from "graphwise/expansion";
import type { ExpansionAlgorithmName } from "./algorithm-registry";
import { getAlgorithm } from "./algorithm-registry";

export interface ComparisonRunnerEntry {
	readonly algorithmName: ExpansionAlgorithmName;
	readonly result: ExpansionResult;
	readonly stats: ExpansionStats;
}

export interface ComparisonRunnerResult {
	readonly entries: readonly ComparisonRunnerEntry[];
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
