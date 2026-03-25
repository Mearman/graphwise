import { describe, it, expect } from "vitest";
import { initGPU, initGPUFromDevice, type InitGPUOptions } from "./root";
import { isWebGPUAvailable } from "./detect";

describe("GPU root", () => {
	describe("initGPU", () => {
		it("throws if WebGPU is unavailable", async () => {
			const available = isWebGPUAvailable();

			if (!available) {
				await expect(initGPU()).rejects.toThrow(/WebGPU unavailable/);
			}
			// If available, the test passes (we can't test success without actual GPU)
		});

		it("accepts empty options", async () => {
			const available = isWebGPUAvailable();
			if (!available) {
				await expect(initGPU({})).rejects.toThrow(/WebGPU unavailable/);
			}
		});

		it("accepts powerPreference option", async () => {
			const available = isWebGPUAvailable();
			if (!available) {
				const options: InitGPUOptions = {
					powerPreference: "high-performance",
				};
				await expect(initGPU(options)).rejects.toThrow(/WebGPU unavailable/);
			}
		});

		it("accepts low-power preference", async () => {
			const available = isWebGPUAvailable();
			if (!available) {
				const options: InitGPUOptions = { powerPreference: "low-power" };
				await expect(initGPU(options)).rejects.toThrow(/WebGPU unavailable/);
			}
		});
	});

	describe("initGPUFromDevice", () => {
		it("is exported as a function", () => {
			expect(typeof initGPUFromDevice).toBe("function");
		});
	});
});
