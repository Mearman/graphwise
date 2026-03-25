/**
 * TypeGPU root initialisation for graphwise GPU operations.
 *
 * Provides a simplified wrapper around TypeGPU's tgpu.init() for
 * GPU device acquisition and resource management.
 *
 * @module gpu/root
 */

import { tgpu } from "typegpu";
import { detectWebGPU } from "./detect";

/**
 * Options for initialising the GPU root.
 */
export interface InitGPUOptions {
	/** Power preference for GPU adapter */
	readonly powerPreference?: "low-power" | "high-performance";
}

/**
 * The TypeGPU root instance used for GPU operations.
 * Re-exports TgpuRoot from TypeGPU for convenience.
 */
export type GraphwiseGPURoot = Awaited<ReturnType<typeof tgpu.init>>;

/**
 * Initialise a TypeGPU root for GPU compute operations.
 *
 * This wraps tgpu.init() with WebGPU availability checking and
 * simplified options.
 *
 * @param options - Initialisation options
 * @returns Promise resolving to a TypeGPU root instance
 * @throws Error if WebGPU is unavailable or device request fails
 *
 * @example
 * ```typescript
 * import { initGPU } from "graphwise/gpu";
 *
 * const root = await initGPU();
 * // Use root for GPU operations...
 * root.destroy();
 * ```
 */
export async function initGPU(
	options: InitGPUOptions = {},
): Promise<GraphwiseGPURoot> {
	const detection = detectWebGPU();
	if (!detection.available) {
		throw new Error(
			`WebGPU unavailable: ${detection.reason ?? "unknown reason"}`,
		);
	}

	const root = await tgpu.init({
		adapter: options.powerPreference
			? { powerPreference: options.powerPreference }
			: undefined,
	});

	return root;
}

/**
 * Create a TypeGPU root from an existing GPU device.
 *
 * Use this when you already have a GPUDevice and want to wrap it
 * with TypeGPU functionality.
 *
 * @param device - Existing GPU device
 * @returns TypeGPU root instance
 *
 * @example
 * ```typescript
 * import { initGPUFromDevice } from "graphwise/gpu";
 *
 * const adapter = await navigator.gpu.requestAdapter();
 * const device = await adapter.requestDevice();
 * const root = initGPUFromDevice(device);
 * ```
 */
export function initGPUFromDevice(device: GPUDevice): GraphwiseGPURoot {
	return tgpu.initFromDevice({ device });
}
