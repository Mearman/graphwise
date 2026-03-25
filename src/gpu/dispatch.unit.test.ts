/**
 * Unit tests for GPU dispatch utilities.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withBackend } from "./dispatch";
import { GPUNotAvailableError } from "./types";
import * as detect from "./detect";
import type { GraphwiseGPURoot } from "./root";

vi.mock("./detect");

/**
 * Creates a mock GraphwiseGPURoot for testing.
 * The mock is intentionally minimal since tests don't execute real GPU code.
 */
function createMockRoot(): GraphwiseGPURoot {
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
	return {} as unknown as GraphwiseGPURoot;
}

describe("withBackend", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("cpu backend", () => {
		it("executes CPU function and returns result", async () => {
			const cpuFn = vi.fn().mockReturnValue(42);
			const gpuFn = vi.fn();

			const result = await withBackend({ backend: "cpu" }, cpuFn, gpuFn);

			expect(result.value).toBe(42);
			expect(result.backend).toBe("cpu");
			expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
			expect(cpuFn).toHaveBeenCalledOnce();
			expect(gpuFn).not.toHaveBeenCalled();
		});

		it("passes through CPU function errors", async () => {
			const cpuFn = vi.fn().mockImplementation(() => {
				throw new Error("CPU error");
			});
			const gpuFn = vi.fn();

			await expect(
				withBackend({ backend: "cpu" }, cpuFn, gpuFn),
			).rejects.toThrow("CPU error");
		});
	});

	describe("gpu backend", () => {
		it("throws GPUNotAvailableError when WebGPU unavailable", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({
				available: false,
				reason: "No adapter",
			});

			const cpuFn = vi.fn();
			const gpuFn = vi.fn();

			await expect(
				withBackend({ backend: "gpu" }, cpuFn, gpuFn),
			).rejects.toThrow(GPUNotAvailableError);
		});

		it("throws error when root not provided", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({
				available: true,
			});

			const cpuFn = vi.fn();
			const gpuFn = vi.fn();

			await expect(
				withBackend({ backend: "gpu" }, cpuFn, gpuFn),
			).rejects.toThrow("GPU backend requires a GraphwiseGPURoot");
		});

		it("executes GPU function when root provided and WebGPU available", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({
				available: true,
			});

			// Create a mock root that satisfies the type without assertion
			const mockRoot = createMockRoot();
			const cpuFn = vi.fn();
			const gpuFn = vi.fn().mockReturnValue(100);

			const result = await withBackend(
				{ backend: "gpu", root: mockRoot },
				cpuFn,
				gpuFn,
			);

			expect(result.value).toBe(100);
			expect(result.backend).toBe("gpu");
			expect(result.elapsedMs).toBeGreaterThanOrEqual(0);
			expect(cpuFn).not.toHaveBeenCalled();
			expect(gpuFn).toHaveBeenCalledWith(mockRoot);
		});

		it("handles async GPU functions", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({
				available: true,
			});

			const mockRoot = createMockRoot();
			const cpuFn = vi.fn();
			const gpuFn = vi.fn().mockResolvedValue("async result");

			const result = await withBackend(
				{ backend: "gpu", root: mockRoot },
				cpuFn,
				gpuFn,
			);

			expect(result.value).toBe("async result");
			expect(result.backend).toBe("gpu");
		});
	});

	describe("auto backend", () => {
		it("uses CPU when WebGPU unavailable", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({
				available: false,
				reason: "No adapter",
			});

			const cpuFn = vi.fn().mockReturnValue("cpu result");
			const gpuFn = vi.fn();

			const result = await withBackend({ backend: "auto" }, cpuFn, gpuFn);

			expect(result.value).toBe("cpu result");
			expect(result.backend).toBe("cpu");
			expect(cpuFn).toHaveBeenCalledOnce();
			expect(gpuFn).not.toHaveBeenCalled();
		});

		it("uses CPU when WebGPU available but no root provided", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({
				available: true,
			});

			const cpuFn = vi.fn().mockReturnValue("cpu fallback");
			const gpuFn = vi.fn();

			const result = await withBackend({ backend: "auto" }, cpuFn, gpuFn);

			expect(result.value).toBe("cpu fallback");
			expect(result.backend).toBe("cpu");
		});

		it("uses GPU when WebGPU available and root provided", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({
				available: true,
			});

			const mockRoot = createMockRoot();
			const cpuFn = vi.fn();
			const gpuFn = vi.fn().mockReturnValue("gpu result");

			const result = await withBackend(
				{ backend: "auto", root: mockRoot },
				cpuFn,
				gpuFn,
			);

			expect(result.value).toBe("gpu result");
			expect(result.backend).toBe("gpu");
			expect(gpuFn).toHaveBeenCalledWith(mockRoot);
		});
	});

	describe("default backend", () => {
		it("defaults to 'auto' when backend not specified", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({
				available: false,
			});

			const cpuFn = vi.fn().mockReturnValue("default");
			const gpuFn = vi.fn();

			const result = await withBackend({}, cpuFn, gpuFn);

			expect(result.backend).toBe("cpu"); // Falls back to CPU in auto mode
		});
	});

	describe("abort signal", () => {
		it("throws AbortError when signal already aborted", async () => {
			const controller = new AbortController();
			controller.abort();

			const cpuFn = vi.fn();
			const gpuFn = vi.fn();

			await expect(
				withBackend({ signal: controller.signal }, cpuFn, gpuFn),
			).rejects.toThrow("Operation aborted");
		});
	});
});
