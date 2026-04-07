/**
 * BASE (Bidirectional Adaptive Seed Exploration) entry points.
 *
 * Provides synchronous `base()` and asynchronous `baseAsync()` entry points.
 * Both delegate to the shared `baseCore` generator, which yields GraphOp
 * objects instead of calling the graph directly.
 *
 * - `base()` drives the generator via `runSync` (zero overhead vs the old impl)
 * - `baseAsync()` drives the generator via `runAsync` (supports cancellation
 *   and progress callbacks)
 *
 * Key properties:
 * 1. Priority-ordered exploration — global min-priority across all frontiers
 * 2. Frontier collision detection — path recorded when frontiers meet
 * 3. Implicit termination — halts when all queues empty
 */

import type { NodeData, EdgeData, ReadableGraph } from "../graph";
import type { AsyncReadableGraph } from "../graph/async-interfaces";
import { runSync, runAsync } from "../async/runners";
import type { AsyncRunnerOptions, YieldStrategy } from "../async/types";
import type { ProgressStats } from "../async/protocol";
import { baseCore } from "./base-core";
import type { Seed, ExplorationResult, ExplorationConfig } from "./types";

/**
 * Configuration for the async BASE exploration algorithm.
 *
 * Extends ExplorationConfig with async runner options (cancellation, progress,
 * yield strategy).
 */
export interface AsyncExpansionConfig<
	N extends NodeData = NodeData,
	E extends EdgeData = EdgeData,
>
	extends ExplorationConfig<N, E>, AsyncRunnerOptions {}

/**
 * Run BASE exploration synchronously.
 *
 * Delegates to baseCore + runSync. Behaviour is identical to the previous
 * direct implementation — all existing callers are unaffected.
 *
 * @param graph - Source graph
 * @param seeds - Seed nodes for exploration
 * @param config - Expansion configuration
 * @returns Expansion result with discovered paths
 */
export function base<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: ExplorationConfig<N, E>,
): ExplorationResult {
	const gen = baseCore<N, E>(
		{
			directed: graph.directed,
			nodeCount: graph.nodeCount,
			edgeCount: graph.edgeCount,
		},
		seeds,
		config,
		graph,
	);
	return runSync(gen, graph);
}

/**
 * Run BASE exploration asynchronously.
 *
 * Delegates to baseCore + runAsync. Supports:
 * - Cancellation via AbortSignal (config.signal)
 * - Progress callbacks (config.onProgress)
 * - Custom cooperative yield strategies (config.yieldStrategy)
 *
 * Note: priority functions that access `context.graph` are not supported in
 * async mode without a graph proxy (Phase 4b). The default degree-based
 * priority (DOME) does not access context.graph and works correctly.
 *
 * @param graph - Async source graph
 * @param seeds - Seed nodes for exploration
 * @param config - Expansion and async runner configuration
 * @returns Promise resolving to the exploration result
 */
export async function baseAsync<N extends NodeData, E extends EdgeData>(
	graph: AsyncReadableGraph<N, E>,
	seeds: readonly Seed[],
	config?: AsyncExpansionConfig<N, E>,
): Promise<ExplorationResult> {
	const [nodeCount, edgeCount] = await Promise.all([
		graph.nodeCount,
		graph.edgeCount,
	]);
	const gen = baseCore<N, E>(
		{ directed: graph.directed, nodeCount, edgeCount },
		seeds,
		config,
		// No graphRef in async mode — priority functions that access
		// context.graph will receive the sentinel and throw. Phase 4b will
		// inject a real async proxy graph here.
	);
	// Build runner options conditionally to satisfy exactOptionalPropertyTypes:
	// optional properties must be omitted entirely rather than set to undefined.
	const runnerOptions: {
		signal?: AbortSignal;
		onProgress?: (stats: ProgressStats) => void | Promise<void>;
		yieldStrategy?: YieldStrategy;
	} = {};
	if (config?.signal !== undefined) {
		runnerOptions.signal = config.signal;
	}
	if (config?.onProgress !== undefined) {
		runnerOptions.onProgress = config.onProgress;
	}
	if (config?.yieldStrategy !== undefined) {
		runnerOptions.yieldStrategy = config.yieldStrategy;
	}
	return runAsync(gen, graph, runnerOptions);
}
