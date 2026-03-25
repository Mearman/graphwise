/**
 * Backend selection and dispatch utilities for GPU compute operations.
 *
 * Provides the `withBackend` function that handles auto/gpu/cpu backend
 * selection with timing and fallback logic.
 *
 * @module gpu/dispatch
 */

import { detectWebGPU } from "./detect";
import {
	GPUNotAvailableError,
	type ComputeBackend,
	type ComputeResult,
} from "./types";
import type { GraphwiseGPURoot } from "./root";

/**
 * Options for backend dispatch.
 */
export interface DispatchOptions {
	/** Backend selection: 'auto', 'gpu', or 'cpu' */
	readonly backend?: ComputeBackend | undefined;
	/** Optional pre-initialised TypeGPU root */
	readonly root?: GraphwiseGPURoot | undefined;
	/** Optional abort signal for cancellation */
	readonly signal?: AbortSignal | undefined;
}

/**
 * CPU compute function type.
 */
export type CPUFunction<T> = () => T;

/**
 * GPU compute function type.
 */
export type GPUFunction<T> = (root: GraphwiseGPURoot) => Promise<T> | T;

/**
 * Execute a compute operation with automatic backend selection.
 *
 * @param options - Backend selection and cancellation options
 * @param cpuFn - CPU fallback implementation
 * @param gpuFn - GPU implementation (receives TypeGPU root)
 * @returns Compute result with backend used and timing
 */
export async function withBackend<T>(
	options: DispatchOptions,
	cpuFn: CPUFunction<T>,
	gpuFn: GPUFunction<T>,
): Promise<ComputeResult<T>> {
	const backend = options.backend ?? "auto";

	// Check for cancellation
	if (options.signal?.aborted === true) {
		throw new DOMException("Operation aborted", "AbortError");
	}

	// CPU backend - synchronous, always available
	if (backend === "cpu") {
		const start = performance.now();
		const value = cpuFn();
		const elapsedMs = performance.now() - start;
		return { value, backend: "cpu", elapsedMs };
	}

	// GPU backend - requires WebGPU
	if (backend === "gpu") {
		const detection = detectWebGPU();
		if (!detection.available) {
			throw new GPUNotAvailableError(detection.reason ?? "Unknown reason");
		}

		const root = options.root;
		if (root === undefined) {
			throw new Error(
				"GPU backend requires a GraphwiseGPURoot. Pass one via options.root or use backend: 'auto'.",
			);
		}

		const start = performance.now();
		const value = await gpuFn(root);
		const elapsedMs = performance.now() - start;
		return { value, backend: "gpu", elapsedMs };
	}

	// Auto backend - detect WebGPU, fall back to CPU
	const detection = detectWebGPU();

	// No WebGPU available - use CPU
	if (!detection.available) {
		const start = performance.now();
		const value = cpuFn();
		const elapsedMs = performance.now() - start;
		return { value, backend: "cpu", elapsedMs };
	}

	// WebGPU available but no root provided - use CPU
	const root = options.root;
	if (root === undefined) {
		const start = performance.now();
		const value = cpuFn();
		const elapsedMs = performance.now() - start;
		return { value, backend: "cpu", elapsedMs };
	}

	// WebGPU available with root - use GPU
	const start = performance.now();
	const value = await gpuFn(root);
	const elapsedMs = performance.now() - start;
	return { value, backend: "gpu", elapsedMs };
}
