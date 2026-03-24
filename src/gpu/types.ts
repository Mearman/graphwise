/**
 * Type definitions for the WebGPU compute backend.
 *
 * These types define the backend selection options and result types
 * for GPU-accelerated graph operations.
 */

/**
 * Backend selection for compute operations.
 *
 * - 'cpu': Synchronous CPU implementation (default, always available)
 * - 'gpu': Async GPU implementation (throws if WebGPU unavailable)
 * - 'auto': Async, detect WebGPU at runtime, fall back to CPU silently
 */
export type ComputeBackend = "auto" | "gpu" | "cpu";

/**
 * Result of WebGPU availability detection.
 */
export interface GPUDetectionResult {
	/** Whether WebGPU is available in the current environment */
	readonly available: boolean;
	/** Human-readable reason if unavailable */
	readonly reason?: string;
}

/**
 * Error thrown when GPU backend is requested but unavailable.
 */
export class GPUNotAvailableError extends Error {
	public constructor(reason: string) {
		super(`WebGPU not available: ${reason}`);
		this.name = "GPUNotAvailableError";
	}
}

/**
 * Result wrapper for GPU operations that may fall back to CPU.
 */
export interface ComputeResult<T> {
	/** The computed result value */
	readonly value: T;
	/** Which backend was actually used */
	readonly backend: "gpu" | "cpu";
	/** Time taken in milliseconds (optional, for profiling) */
	readonly elapsedMs?: number;
}

/**
 * Configuration options for GPU compute operations.
 */
export interface GPUComputeOptions {
	/** Backend selection: 'auto', 'gpu', or 'cpu' */
	readonly backend?: ComputeBackend;
	/** Optional GPU device to reuse (avoids device acquisition overhead) */
	readonly device?: GPUDevice;
}
