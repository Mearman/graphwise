import { describe, it, expect } from "vitest";
import {
	detectWebGPU,
	isWebGPUAvailable,
	assertWebGPUAvailable,
} from "./detect";

describe("GPU detection", () => {
	describe("detectWebGPU", () => {
		it("returns a result object", () => {
			const result = detectWebGPU();
			expect(result).toHaveProperty("available");
			expect(typeof result.available).toBe("boolean");
		});

		it("includes reason when not available", () => {
			const result = detectWebGPU();
			if (!result.available) {
				expect(result.reason).toBeDefined();
				expect(typeof result.reason).toBe("string");
			}
		});
	});

	describe("isWebGPUAvailable", () => {
		it("returns a boolean", () => {
			const result = isWebGPUAvailable();
			expect(typeof result).toBe("boolean");
		});
	});

	describe("assertWebGPUAvailable", () => {
		it("does not throw when WebGPU is available", () => {
			const available = isWebGPUAvailable();
			if (available) {
				expect(() => {
					assertWebGPUAvailable();
				}).not.toThrow();
			}
		});

		it("throws descriptive error when WebGPU is not available", () => {
			const available = isWebGPUAvailable();
			if (!available) {
				expect(() => {
					assertWebGPUAvailable();
				}).toThrow(/WebGPU required/);
			}
		});
	});
});
