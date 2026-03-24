/**
 * GPU context management for WebGPU compute operations.
 *
 * Provides device acquisition, buffer pooling, and shader compilation
 * with caching for efficient GPU resource management.
 */

import { detectWebGPU } from "./detect";

/**
 * Type guard to check if an object has a WebGPU-compatible requestAdapter method.
 */
function hasRequestAdapter(obj: unknown): obj is {
	requestAdapter: (
		opts?: GPURequestAdapterOptions,
	) => Promise<GPUAdapter | null>;
} {
	if (typeof obj !== "object" || obj === null) {
		return false;
	}
	if (!("requestAdapter" in obj)) {
		return false;
	}
	// Use Object.getOwnPropertyDescriptor to safely check property type
	const descriptor = Object.getOwnPropertyDescriptor(obj, "requestAdapter");
	return descriptor !== undefined && typeof descriptor.value === "function";
}

/**
 * Options for creating a GPUContext.
 */
export interface GPUContextOptions {
	/** Power preference for GPU adapter */
	readonly powerPreference?: "low-power" | "high-performance";
	/** Force create new context even if one exists */
	readonly forceNew?: boolean;
}

/**
 * Shader module cache entry.
 */
interface CachedShader {
	readonly module: GPUShaderModule;
	readonly code: string;
}

/**
 * Manages GPU device, buffers, and compiled shaders.
 *
 * Use the singleton pattern via getGPUContext() for most use cases,
 * or create separate contexts for isolated GPU resource pools.
 */
export class GPUContext {
	private device: GPUDevice | null = null;
	private readonly shaderCache = new Map<string, CachedShader>();
	private readonly bufferPool: GPUBuffer[] = [];
	private readonly destroyedBuffers = new WeakSet<GPUBuffer>();

	/**
	 * Check if this context has an acquired GPU device.
	 */
	public get isReady(): boolean {
		return this.device !== null;
	}

	/**
	 * Get the GPU device, throwing if not acquired.
	 */
	public getDevice(): GPUDevice {
		if (this.device === null) {
			throw new Error(
				"GPUContext not initialised. Call acquireDevice() first.",
			);
		}
		return this.device;
	}

	/**
	 * Acquire a GPU device from the adapter.
	 *
	 * @param options - Context creation options
	 * @returns true if device was acquired successfully
	 * @throws Error if WebGPU is unavailable or device request fails
	 */
	public async acquireDevice(
		options: GPUContextOptions = {},
	): Promise<boolean> {
		const detection = detectWebGPU();
		if (!detection.available) {
			throw new Error(
				`WebGPU unavailable: ${detection.reason ?? "unknown reason"}`,
			);
		}

		// Get adapter
		let adapter: GPUAdapter | null = null;

		// Build adapter options, only including powerPreference if defined
		const adapterOpts: GPURequestAdapterOptions =
			options.powerPreference !== undefined
				? { powerPreference: options.powerPreference }
				: {};

		if (typeof navigator !== "undefined" && "gpu" in navigator) {
			adapter = await navigator.gpu.requestAdapter(adapterOpts);
		}

		// Node.js / Deno fallback via global GPU
		if (
			adapter === null &&
			typeof globalThis !== "undefined" &&
			"GPU" in globalThis
		) {
			// Access gpu property via Object.getOwnPropertyDescriptor to avoid type assertion
			const gpuDescriptor = Object.getOwnPropertyDescriptor(globalThis, "gpu");
			// Pass descriptor value directly to type guard to avoid unsafe assignment
			if (
				gpuDescriptor !== undefined &&
				hasRequestAdapter(gpuDescriptor.value)
			) {
				adapter = await gpuDescriptor.value.requestAdapter(adapterOpts);
			}
		}

		if (adapter === null) {
			throw new Error("No GPU adapter found");
		}

		// Request device
		this.device = await adapter.requestDevice();

		// Handle device loss
		void this.device.lost.then((info: GPUDeviceLostInfo): void => {
			console.error(`GPU device lost: ${info.message}`);
			this.device = null;
			this.clearCache();
		});

		return true;
	}

	/**
	 * Compile a WGSL shader, using cache if available.
	 *
	 * @param code - WGSL shader code
	 * @param key - Optional cache key (defaults to code hash)
	 * @returns Compiled shader module
	 */
	public compileShader(code: string, key?: string): GPUShaderModule {
		const cacheKey = key ?? this.hashCode(code);
		const cached = this.shaderCache.get(cacheKey);

		if (cached?.code === code) {
			return cached.module;
		}

		const device = this.getDevice();
		const module = device.createShaderModule({ code });

		this.shaderCache.set(cacheKey, { module, code });
		return module;
	}

	/**
	 * Create a GPU buffer, optionally reusing from pool.
	 *
	 * @param size - Buffer size in bytes
	 * @param usage - Buffer usage flags
	 * @returns GPU buffer
	 */
	public createBuffer(size: number, usage: GPUBufferUsageFlags): GPUBuffer {
		// Try to find a suitable buffer in the pool
		for (let i = 0; i < this.bufferPool.length; i++) {
			const buffer = this.bufferPool[i];
			if (
				buffer !== undefined &&
				!this.destroyedBuffers.has(buffer) &&
				buffer.size >= size &&
				(buffer.usage & usage) === usage
			) {
				this.bufferPool.splice(i, 1);
				return buffer;
			}
		}

		// Create new buffer
		const device = this.getDevice();
		return device.createBuffer({ size, usage });
	}

	/**
	 * Return a buffer to the pool for reuse.
	 *
	 * @param buffer - Buffer to recycle
	 */
	public recycleBuffer(buffer: GPUBuffer): void {
		// Only pool if buffer is not destroyed
		if (!this.destroyedBuffers.has(buffer)) {
			this.bufferPool.push(buffer);
		}
	}

	/**
	 * Mark a buffer as destroyed (call before GPUBuffer.destroy()).
	 *
	 * @param buffer - Buffer to mark as destroyed
	 */
	public markDestroyed(buffer: GPUBuffer): void {
		this.destroyedBuffers.add(buffer);
	}

	/**
	 * Create a compute pipeline from shader code.
	 *
	 * @param code - WGSL compute shader code
	 * @param entryPoint - Entry point function name
	 * @returns Compute pipeline
	 */
	public createComputePipeline(
		code: string,
		entryPoint = "main",
	): GPUComputePipeline {
		const device = this.getDevice();
		const module = this.compileShader(code);

		return device.createComputePipeline({
			layout: "auto",
			compute: {
				module,
				entryPoint,
			},
		});
	}

	/**
	 * Create a compute pipeline asynchronously (preferred for performance).
	 *
	 * @param code - WGSL compute shader code
	 * @param entryPoint - Entry point function name
	 * @returns Promise resolving to compute pipeline
	 */
	public async createComputePipelineAsync(
		code: string,
		entryPoint = "main",
	): Promise<GPUComputePipeline> {
		const device = this.getDevice();
		const module = this.compileShader(code);

		return device.createComputePipelineAsync({
			layout: "auto",
			compute: {
				module,
				entryPoint,
			},
		});
	}

	/**
	 * Clear all cached resources.
	 */
	public clearCache(): void {
		this.shaderCache.clear();
		for (const buffer of this.bufferPool) {
			buffer.destroy();
		}
		this.bufferPool.length = 0;
	}

	/**
	 * Destroy the context and release all resources.
	 */
	public destroy(): void {
		this.clearCache();
		if (this.device !== null) {
			this.device.destroy();
			this.device = null;
		}
	}

	/**
	 * Simple string hash for cache keys.
	 */
	private hashCode(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i);
			hash = ((hash << 5) - hash + char) | 0;
		}
		return hash.toString(16);
	}
}

// Singleton instance for default context
let defaultContext: GPUContext | null = null;

/**
 * Get or create the default GPU context.
 *
 * This is a lazy singleton - the device is not acquired until
 * acquireDevice() is called.
 *
 * @param options - Context creation options
 * @returns GPU context instance
 */
export function getGPUContext(options?: GPUContextOptions): GPUContext {
	if (defaultContext === null || (options?.forceNew ?? false)) {
		defaultContext = new GPUContext();
	}
	return defaultContext;
}

/**
 * Create a new isolated GPU context.
 *
 * Use this when you need separate resource pools or device management.
 *
 * @returns New GPU context instance
 */
export function createGPUContext(): GPUContext {
	return new GPUContext();
}
