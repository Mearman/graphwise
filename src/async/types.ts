/**
 * Async runner configuration types.
 *
 * @module async/types
 */

import type { ProgressStats } from "./protocol";

/** Strategy for cooperative yielding in async mode. */
export type YieldStrategy = () => Promise<void>;

/** Configuration for the async runner. */
export interface AsyncRunnerOptions {
	/** AbortSignal for cancellation. */
	readonly signal?: AbortSignal;
	/** Progress callback, called at yield points. Async return = backpressure. */
	readonly onProgress?: (stats: ProgressStats) => void | Promise<void>;
	/** Custom yield strategy (default: setTimeout(0)). */
	readonly yieldStrategy?: YieldStrategy;
	/** Yield every N iterations (default: 100). */
	readonly yieldInterval?: number;
}
