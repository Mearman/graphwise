/**
 * WebGPU availability detection for browser and Node.js environments.
 *
 * This module provides runtime detection of WebGPU support without
 * requiring any polyfills or runtime dependencies.
 */

import type { GPUDetectionResult } from "./types";

/**
 * Detect WebGPU availability in the current environment.
 *
 * Checks for:
 * - Browser: navigator.gpu
 * - Node.js: global GPU constructor (Node.js 21+ with --experimental-webgpu)
 * - Deno: global GPU constructor
 *
 * @returns Detection result with availability status and reason
 */
export function detectWebGPU(): GPUDetectionResult {
	// Check for browser WebGPU API
	if (typeof navigator !== "undefined" && "gpu" in navigator) {
		return { available: true };
	}

	// Check for Node.js / Deno global GPU
	if (typeof globalThis !== "undefined" && "GPU" in globalThis) {
		return { available: true };
	}

	// WebGPU not available
	const reasons: string[] = [];

	if (typeof navigator === "undefined" && typeof globalThis === "undefined") {
		reasons.push("no global scope detected");
	} else if (typeof navigator !== "undefined" && !("gpu" in navigator)) {
		reasons.push("navigator.gpu not present (browser may not support WebGPU)");
	} else if (typeof globalThis !== "undefined" && !("GPU" in globalThis)) {
		reasons.push(
			"global GPU not present (Node.js requires v21+ with --experimental-webgpu flag)",
		);
	}

	return {
		available: false,
		reason: reasons.length > 0 ? reasons.join("; ") : "unknown environment",
	};
}

/**
 * Check if WebGPU is available (convenience function).
 *
 * @returns true if WebGPU is available, false otherwise
 */
export function isWebGPUAvailable(): boolean {
	return detectWebGPU().available;
}

/**
 * Assert that WebGPU is available, throwing an error if not.
 *
 * @throws Error if WebGPU is not available
 */
export function assertWebGPUAvailable(): void {
	const result = detectWebGPU();
	if (!result.available) {
		throw new Error(
			`WebGPU required but not available: ${result.reason ?? "unknown reason"}`,
		);
	}
}
