/**
 * WebGPU compute backend for graph algorithms.
 *
 * @module gpu - WebGPU compute utilities
 */

export type {
	ComputeBackend,
	GPUNotAvailableError,
	ComputeResult,
	GPUDetectionResult,
} from "./types";
export type { CSRMatrix, GPUBufferGroup } from "./csr";
export { detectWebGPU } from "./detect";
export { GPUContext } from "./context";
export { graphToCSR, csrToGPUBuffers } from "./csr";
