import { describe, it, expect, vi, beforeEach } from "vitest";
import { GPUContext, getGPUContext, createGPUContext } from "./context";
import * as detect from "./detect";

// Mock the detect module
vi.mock("./detect", () => ({
	detectWebGPU: vi.fn(),
}));

interface MockGPUDevice {
	createShaderModule: ReturnType<typeof vi.fn>;
	createBuffer: ReturnType<typeof vi.fn>;
	createComputePipeline: ReturnType<typeof vi.fn>;
	createComputePipelineAsync: ReturnType<typeof vi.fn>;
	destroy: ReturnType<typeof vi.fn>;
	lost: Promise<GPUDeviceLostInfo>;
}

interface MockGPUAdapter {
	requestDevice: ReturnType<typeof vi.fn>;
}

function createMockBuffer(size: number, usage: number): GPUBuffer {
	const buffer = {
		size,
		usage,
		destroy: vi.fn(),
		mapState: "unmapped" as const,
		getMappedRange: vi.fn(() => new ArrayBuffer(size)),
		mapAsync: vi.fn().mockResolvedValue(undefined),
		unmap: vi.fn(),
	};
	// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
	return buffer as unknown as GPUBuffer;
}

function createMockDevice(): MockGPUDevice {
	return {
		createShaderModule: vi.fn(() => ({})),
		createBuffer: vi.fn((opts: { size: number; usage: number }) =>
			createMockBuffer(opts.size, opts.usage),
		),
		createComputePipeline: vi.fn(() => ({})),
		createComputePipelineAsync: vi.fn().mockResolvedValue({}),
		destroy: vi.fn(),
		// eslint-disable-next-line @typescript-eslint/no-empty-function
		lost: new Promise(() => {}),
	};
}

function createMockAdapter(device: MockGPUDevice): MockGPUAdapter {
	return {
		requestDevice: vi.fn().mockResolvedValue(device),
	};
}

/**
 * Helper to mock navigator.gpu using Object.defineProperty.
 * Returns a cleanup function to restore original state.
 */
function mockNavigatorGpu(adapter: MockGPUAdapter | null): () => void {
	const originalDescriptor = Object.getOwnPropertyDescriptor(
		globalThis,
		"navigator",
	);

	const mockGpu = {
		requestAdapter: vi.fn().mockResolvedValue(adapter),
	};

	const mockNavigator = {
		gpu: mockGpu,
	};

	Object.defineProperty(globalThis, "navigator", {
		value: mockNavigator,
		configurable: true,
		writable: true,
	});

	return () => {
		if (originalDescriptor) {
			Object.defineProperty(globalThis, "navigator", originalDescriptor);
		} else {
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
			delete (globalThis as Record<string, unknown>)["navigator"];
		}
	};
}

/**
 * Helper to mock global gpu property for Node.js/Deno fallback.
 * Returns a cleanup function to restore original state.
 */
function mockGlobalGpu(adapter: MockGPUAdapter | null): () => void {
	const originalGpuDescriptor = Object.getOwnPropertyDescriptor(
		globalThis,
		"gpu",
	);
	const originalGPUDescriptor = Object.getOwnPropertyDescriptor(
		globalThis,
		"GPU",
	);

	Object.defineProperty(globalThis, "GPU", {
		// eslint-disable-next-line @typescript-eslint/no-extraneous-class
		value: class {},
		configurable: true,
		writable: true,
	});

	Object.defineProperty(globalThis, "gpu", {
		value: {
			requestAdapter: vi.fn().mockResolvedValue(adapter),
		},
		configurable: true,
		writable: true,
	});

	return () => {
		if (originalGpuDescriptor) {
			Object.defineProperty(globalThis, "gpu", originalGpuDescriptor);
		} else {
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
			delete (globalThis as Record<string, unknown>)["gpu"];
		}
		if (originalGPUDescriptor) {
			Object.defineProperty(globalThis, "GPU", originalGPUDescriptor);
		} else {
			// eslint-disable-next-line @typescript-eslint/consistent-type-assertions
			delete (globalThis as Record<string, unknown>)["GPU"];
		}
	};
}

describe("GPUContext", () => {
	let mockDevice: MockGPUDevice;
	let mockAdapter: MockGPUAdapter;

	beforeEach(() => {
		vi.clearAllMocks();
		mockDevice = createMockDevice();
		mockAdapter = createMockAdapter(mockDevice);
	});

	describe("isReady", () => {
		it("returns false before device is acquired", () => {
			const ctx = new GPUContext();
			expect(ctx.isReady).toBe(false);
		});
	});

	describe("getDevice", () => {
		it("throws when device not initialised", () => {
			const ctx = new GPUContext();
			expect(() => ctx.getDevice()).toThrow(
				"GPUContext not initialised. Call acquireDevice() first.",
			);
		});
	});

	describe("acquireDevice", () => {
		it("throws when WebGPU is unavailable", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({
				available: false,
				reason: "navigator.gpu not present",
			});

			const ctx = new GPUContext();
			await expect(ctx.acquireDevice()).rejects.toThrow(
				"WebGPU unavailable: navigator.gpu not present",
			);
		});

		it("throws with unknown reason when WebGPU unavailable without reason", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({
				available: false,
				reason: undefined,
			});

			const ctx = new GPUContext();
			await expect(ctx.acquireDevice()).rejects.toThrow(
				"WebGPU unavailable: unknown reason",
			);
		});

		it("throws when no adapter is found", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({ available: true });

			const ctx = new GPUContext();
			await expect(ctx.acquireDevice()).rejects.toThrow("No GPU adapter found");
		});

		it("acquires device via navigator.gpu", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({ available: true });

			const cleanup = mockNavigatorGpu(mockAdapter);

			const ctx = new GPUContext();
			const result = await ctx.acquireDevice();

			expect(result).toBe(true);
			expect(ctx.isReady).toBe(true);

			cleanup();
		});

		it("acquires device with power preference", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({ available: true });

			const cleanup = mockNavigatorGpu(mockAdapter);

			const ctx = new GPUContext();
			await ctx.acquireDevice({ powerPreference: "high-performance" });

			expect(ctx.isReady).toBe(true);

			cleanup();
		});

		it("falls back to global GPU when navigator.gpu returns null", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({ available: true });

			// Mock navigator.gpu to return null adapter
			const cleanupNav = mockNavigatorGpu(null);
			const cleanupGlobal = mockGlobalGpu(mockAdapter);

			const ctx = new GPUContext();
			const result = await ctx.acquireDevice();

			expect(result).toBe(true);
			expect(ctx.isReady).toBe(true);

			cleanupNav();
			cleanupGlobal();
		});
	});

	describe("compileShader", () => {
		it("throws when device not initialised", () => {
			const ctx = new GPUContext();
			expect(() => ctx.compileShader("code")).toThrow(
				"GPUContext not initialised",
			);
		});

		it("creates shader module via device", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({ available: true });

			const cleanup = mockNavigatorGpu(mockAdapter);

			const ctx = new GPUContext();
			await ctx.acquireDevice();

			const code = "@compute @workgroup_size(1) fn main() {}";
			const module = ctx.compileShader(code);

			expect(mockDevice.createShaderModule).toHaveBeenCalledWith({ code });
			expect(module).toBeDefined();

			cleanup();
		});

		it("caches shader modules by default key", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({ available: true });

			const cleanup = mockNavigatorGpu(mockAdapter);

			const ctx = new GPUContext();
			await ctx.acquireDevice();

			const code = "@compute @workgroup_size(1) fn main() {}";
			ctx.compileShader(code);
			ctx.compileShader(code);

			expect(mockDevice.createShaderModule).toHaveBeenCalledTimes(1);

			cleanup();
		});

		it("caches shader modules with custom key", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({ available: true });

			const cleanup = mockNavigatorGpu(mockAdapter);

			const ctx = new GPUContext();
			await ctx.acquireDevice();

			const code = "@compute @workgroup_size(1) fn main() {}";
			ctx.compileShader(code, "custom-key");
			ctx.compileShader(code, "custom-key");

			expect(mockDevice.createShaderModule).toHaveBeenCalledTimes(1);

			cleanup();
		});

		it("recompiles when code differs but key is same", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({ available: true });

			const cleanup = mockNavigatorGpu(mockAdapter);

			const ctx = new GPUContext();
			await ctx.acquireDevice();

			ctx.compileShader("code v1", "my-key");
			ctx.compileShader("code v2", "my-key");

			expect(mockDevice.createShaderModule).toHaveBeenCalledTimes(2);

			cleanup();
		});
	});

	describe("createBuffer", () => {
		it("throws when device not initialised", () => {
			const ctx = new GPUContext();
			expect(() => ctx.createBuffer(1024, 1)).toThrow(
				"GPUContext not initialised",
			);
		});

		it("creates new buffer via device", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({ available: true });

			const cleanup = mockNavigatorGpu(mockAdapter);

			const ctx = new GPUContext();
			await ctx.acquireDevice();

			const buffer = ctx.createBuffer(1024, 8);

			expect(mockDevice.createBuffer).toHaveBeenCalledWith({
				size: 1024,
				usage: 8,
			});
			expect(buffer).toBeDefined();

			cleanup();
		});

		it("reuses buffer from pool when suitable", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({ available: true });

			const cleanup = mockNavigatorGpu(mockAdapter);

			const ctx = new GPUContext();
			await ctx.acquireDevice();

			const pooledBuffer = createMockBuffer(2048, 15);
			ctx.recycleBuffer(pooledBuffer);

			// Request a buffer that can be satisfied from pool
			// size <= pooled size and usage is subset of pooled usage
			const buffer = ctx.createBuffer(1024, 5); // 5 is subset of 15

			expect(buffer).toBe(pooledBuffer);
			expect(mockDevice.createBuffer).not.toHaveBeenCalled();

			cleanup();
		});

		it("creates new buffer when pool has no suitable buffer", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({ available: true });

			const cleanup = mockNavigatorGpu(mockAdapter);

			const ctx = new GPUContext();
			await ctx.acquireDevice();

			// Create a buffer with specific size/usage
			const smallBuffer = createMockBuffer(512, 8);
			ctx.recycleBuffer(smallBuffer);

			// Request a larger buffer - should create new
			ctx.createBuffer(1024, 8);

			expect(mockDevice.createBuffer).toHaveBeenCalled();

			cleanup();
		});

		it("creates new buffer when usage flags not satisfied", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({ available: true });

			const cleanup = mockNavigatorGpu(mockAdapter);

			const ctx = new GPUContext();
			await ctx.acquireDevice();

			// Create a buffer with usage = 8 (STORAGE)
			const storageBuffer = createMockBuffer(1024, 8);
			ctx.recycleBuffer(storageBuffer);

			// Request with usage = 16 (MAP_READ) - not a subset
			ctx.createBuffer(512, 16);

			expect(mockDevice.createBuffer).toHaveBeenCalled();

			cleanup();
		});
	});

	describe("recycleBuffer", () => {
		it("adds buffer to pool", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({ available: true });

			const cleanup = mockNavigatorGpu(mockAdapter);

			const ctx = new GPUContext();
			await ctx.acquireDevice();

			// Pool a buffer with usage flags 15 (which includes 5)
			// 15 = 8 | 4 | 2 | 1, so 5 = 4 | 1 is a subset
			const buffer = createMockBuffer(1024, 15);
			ctx.recycleBuffer(buffer);

			// Verify it's reused - request with usage 5 which is a subset of 15
			const reused = ctx.createBuffer(512, 5);
			expect(reused).toBe(buffer);

			cleanup();
		});

		it("does not add destroyed buffer to pool", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({ available: true });

			const cleanup = mockNavigatorGpu(mockAdapter);

			const ctx = new GPUContext();
			await ctx.acquireDevice();

			const buffer = createMockBuffer(1024, 8);
			ctx.markDestroyed(buffer);
			ctx.recycleBuffer(buffer);

			// Should create new since destroyed buffer not pooled
			ctx.createBuffer(512, 4);
			expect(mockDevice.createBuffer).toHaveBeenCalled();

			cleanup();
		});
	});

	describe("markDestroyed", () => {
		it("prevents buffer from being pooled", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({ available: true });

			const cleanup = mockNavigatorGpu(mockAdapter);

			const ctx = new GPUContext();
			await ctx.acquireDevice();

			const buffer = createMockBuffer(1024, 8);
			ctx.markDestroyed(buffer);
			ctx.recycleBuffer(buffer);

			// Should create new since marked destroyed
			ctx.createBuffer(512, 4);
			expect(mockDevice.createBuffer).toHaveBeenCalled();

			cleanup();
		});
	});

	describe("createComputePipeline", () => {
		it("throws when device not initialised", () => {
			const ctx = new GPUContext();
			expect(() => ctx.createComputePipeline("code")).toThrow(
				"GPUContext not initialised",
			);
		});

		it("creates pipeline with default entry point", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({ available: true });

			const cleanup = mockNavigatorGpu(mockAdapter);

			const ctx = new GPUContext();
			await ctx.acquireDevice();

			const code = "@compute @workgroup_size(1) fn main() {}";
			ctx.createComputePipeline(code);

			expect(mockDevice.createComputePipeline).toHaveBeenCalledWith({
				layout: "auto",
				compute: {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					module: expect.any(Object),
					entryPoint: "main",
				},
			});

			cleanup();
		});

		it("creates pipeline with custom entry point", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({ available: true });

			const cleanup = mockNavigatorGpu(mockAdapter);

			const ctx = new GPUContext();
			await ctx.acquireDevice();

			const code = "@compute @workgroup_size(1) fn custom() {}";
			ctx.createComputePipeline(code, "custom");

			expect(mockDevice.createComputePipeline).toHaveBeenCalledWith({
				layout: "auto",
				compute: {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					module: expect.any(Object),
					entryPoint: "custom",
				},
			});

			cleanup();
		});
	});

	describe("createComputePipelineAsync", () => {
		it("throws when device not initialised", async () => {
			const ctx = new GPUContext();
			await expect(ctx.createComputePipelineAsync("code")).rejects.toThrow(
				"GPUContext not initialised",
			);
		});

		it("creates pipeline asynchronously", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({ available: true });

			const cleanup = mockNavigatorGpu(mockAdapter);

			const ctx = new GPUContext();
			await ctx.acquireDevice();

			const code = "@compute @workgroup_size(1) fn main() {}";
			await ctx.createComputePipelineAsync(code);

			expect(mockDevice.createComputePipelineAsync).toHaveBeenCalledWith({
				layout: "auto",
				compute: {
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					module: expect.any(Object),
					entryPoint: "main",
				},
			});

			cleanup();
		});
	});

	describe("clearCache", () => {
		it("clears shader cache", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({ available: true });

			const cleanup = mockNavigatorGpu(mockAdapter);

			const ctx = new GPUContext();
			await ctx.acquireDevice();

			const code = "@compute @workgroup_size(1) fn main() {}";
			ctx.compileShader(code);
			ctx.clearCache();
			ctx.compileShader(code);

			// Should compile twice after cache cleared
			expect(mockDevice.createShaderModule).toHaveBeenCalledTimes(2);

			cleanup();
		});

		it("destroys pooled buffers", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({ available: true });

			const cleanup = mockNavigatorGpu(mockAdapter);

			const ctx = new GPUContext();
			await ctx.acquireDevice();

			const buffer = createMockBuffer(1024, 8);
			ctx.recycleBuffer(buffer);
			ctx.clearCache();

			// eslint-disable-next-line @typescript-eslint/unbound-method
			expect(buffer.destroy).toHaveBeenCalled();

			cleanup();
		});
	});

	describe("destroy", () => {
		it("clears cache and destroys device", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({ available: true });

			const cleanup = mockNavigatorGpu(mockAdapter);

			const ctx = new GPUContext();
			await ctx.acquireDevice();
			ctx.destroy();

			expect(mockDevice.destroy).toHaveBeenCalled();
			expect(ctx.isReady).toBe(false);

			cleanup();
		});

		it("is safe to call multiple times", async () => {
			vi.mocked(detect.detectWebGPU).mockReturnValue({ available: true });

			const cleanup = mockNavigatorGpu(mockAdapter);

			const ctx = new GPUContext();
			await ctx.acquireDevice();
			ctx.destroy();
			ctx.destroy(); // Should not throw

			expect(ctx.isReady).toBe(false);

			cleanup();
		});
	});
});

describe("getGPUContext", () => {
	it("returns same instance by default", () => {
		// Reset the singleton by forcing new
		const ctx1 = getGPUContext({ forceNew: true });
		const ctx2 = getGPUContext();
		expect(ctx2).toBe(ctx1);
	});

	it("returns new instance when forceNew is true", () => {
		const ctx1 = getGPUContext({ forceNew: true });
		const ctx2 = getGPUContext({ forceNew: true });
		expect(ctx2).not.toBe(ctx1);
	});
});

describe("createGPUContext", () => {
	it("creates a new GPUContext instance", () => {
		const ctx = createGPUContext();
		expect(ctx).toBeInstanceOf(GPUContext);
	});

	it("creates different instances each call", () => {
		const ctx1 = createGPUContext();
		const ctx2 = createGPUContext();
		expect(ctx1).not.toBe(ctx2);
	});
});
