import { describe, expect, it } from "vitest";
import {
	NodeId,
	Direction,
	NodeData,
	EdgeData,
	SeedRole,
	Seed,
	ComputeBackend,
} from "./graph";

describe("NodeId", () => {
	describe("valid values", () => {
		it("should accept non-empty strings", (): void => {
			expect(NodeId.is("node-1")).toBe(true);
		});

		it("should accept UUID-like strings", (): void => {
			expect(NodeId.is("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
		});

		it("should accept numeric strings", (): void => {
			expect(NodeId.is("12345")).toBe(true);
		});

		it("should accept single character strings", (): void => {
			expect(NodeId.is("a")).toBe(true);
		});
	});

	describe("invalid values", () => {
		it("should reject empty strings", (): void => {
			expect(NodeId.is("")).toBe(false);
		});

		it("should reject numbers", (): void => {
			expect(NodeId.is(123)).toBe(false);
		});

		it("should reject null", (): void => {
			expect(NodeId.is(null)).toBe(false);
		});

		it("should reject undefined", (): void => {
			expect(NodeId.is(undefined)).toBe(false);
		});

		it("should reject objects", (): void => {
			expect(NodeId.is({ id: "node-1" })).toBe(false);
		});
	});
});

describe("Direction", () => {
	describe("valid values", () => {
		it("should accept 'in'", (): void => {
			expect(Direction.is("in")).toBe(true);
		});

		it("should accept 'out'", (): void => {
			expect(Direction.is("out")).toBe(true);
		});

		it("should accept 'both'", (): void => {
			expect(Direction.is("both")).toBe(true);
		});
	});

	describe("invalid values", () => {
		it("should reject other strings", (): void => {
			expect(Direction.is("left")).toBe(false);
			expect(Direction.is("right")).toBe(false);
			expect(Direction.is("IN")).toBe(false);
			expect(Direction.is("Out")).toBe(false);
		});

		it("should reject numbers", (): void => {
			expect(Direction.is(0)).toBe(false);
			expect(Direction.is(1)).toBe(false);
		});

		it("should reject null and undefined", (): void => {
			expect(Direction.is(null)).toBe(false);
			expect(Direction.is(undefined)).toBe(false);
		});
	});
});

describe("NodeData", () => {
	describe("valid values", () => {
		it("should accept object with required id only", (): void => {
			expect(NodeData.is({ id: "node-1" })).toBe(true);
		});

		it("should accept object with id and type", (): void => {
			expect(NodeData.is({ id: "node-1", type: "person" })).toBe(true);
		});

		it("should accept object with id and weight", (): void => {
			expect(NodeData.is({ id: "node-1", weight: 1.5 })).toBe(true);
		});

		it("should accept object with all fields", (): void => {
			expect(
				NodeData.is({
					id: "node-1",
					type: "document",
					weight: 2.5,
				}),
			).toBe(true);
		});

		it("should accept zero weight", (): void => {
			expect(NodeData.is({ id: "node-1", weight: 0 })).toBe(true);
		});

		it("should accept integer weight", (): void => {
			expect(NodeData.is({ id: "node-1", weight: 5 })).toBe(true);
		});
	});

	describe("invalid values", () => {
		it("should reject object without id", (): void => {
			expect(NodeData.is({ type: "person" })).toBe(false);
		});

		it("should reject empty id", (): void => {
			expect(NodeData.is({ id: "" })).toBe(false);
		});

		it("should reject negative weight", (): void => {
			expect(NodeData.is({ id: "node-1", weight: -1 })).toBe(false);
		});

		it("should reject non-string id", (): void => {
			expect(NodeData.is({ id: 123 })).toBe(false);
		});

		it("should reject non-string type", (): void => {
			expect(NodeData.is({ id: "node-1", type: 123 })).toBe(false);
		});

		it("should reject non-number weight", (): void => {
			expect(NodeData.is({ id: "node-1", weight: "heavy" })).toBe(false);
		});

		it("should reject null", (): void => {
			expect(NodeData.is(null)).toBe(false);
		});

		it("should reject array", (): void => {
			expect(NodeData.is([{ id: "node-1" }])).toBe(false);
		});
	});
});

describe("EdgeData", () => {
	describe("valid values", () => {
		it("should accept object with source and target only", (): void => {
			expect(EdgeData.is({ source: "a", target: "b" })).toBe(true);
		});

		it("should accept object with source, target, and weight", (): void => {
			expect(EdgeData.is({ source: "a", target: "b", weight: 1.0 })).toBe(true);
		});

		it("should accept object with source, target, and type", (): void => {
			expect(EdgeData.is({ source: "a", target: "b", type: "cites" })).toBe(
				true,
			);
		});

		it("should accept object with all fields", (): void => {
			expect(
				EdgeData.is({
					source: "a",
					target: "b",
					weight: 0.5,
					type: "references",
				}),
			).toBe(true);
		});

		it("should accept zero weight", (): void => {
			expect(EdgeData.is({ source: "a", target: "b", weight: 0 })).toBe(true);
		});

		it("should accept self-loop (source equals target)", (): void => {
			expect(EdgeData.is({ source: "a", target: "a" })).toBe(true);
		});
	});

	describe("invalid values", () => {
		it("should reject object without source", (): void => {
			expect(EdgeData.is({ target: "b" })).toBe(false);
		});

		it("should reject object without target", (): void => {
			expect(EdgeData.is({ source: "a" })).toBe(false);
		});

		it("should reject empty source", (): void => {
			expect(EdgeData.is({ source: "", target: "b" })).toBe(false);
		});

		it("should reject empty target", (): void => {
			expect(EdgeData.is({ source: "a", target: "" })).toBe(false);
		});

		it("should reject negative weight", (): void => {
			expect(EdgeData.is({ source: "a", target: "b", weight: -0.1 })).toBe(
				false,
			);
		});

		it("should reject non-string source", (): void => {
			expect(EdgeData.is({ source: 1, target: "b" })).toBe(false);
		});

		it("should reject non-string target", (): void => {
			expect(EdgeData.is({ source: "a", target: 2 })).toBe(false);
		});

		it("should reject null", (): void => {
			expect(EdgeData.is(null)).toBe(false);
		});
	});
});

describe("SeedRole", () => {
	describe("valid values", () => {
		it("should accept 'source'", (): void => {
			expect(SeedRole.is("source")).toBe(true);
		});

		it("should accept 'target'", (): void => {
			expect(SeedRole.is("target")).toBe(true);
		});

		it("should accept 'bidirectional'", (): void => {
			expect(SeedRole.is("bidirectional")).toBe(true);
		});
	});

	describe("invalid values", () => {
		it("should reject other strings", (): void => {
			expect(SeedRole.is("both")).toBe(false);
			expect(SeedRole.is("in")).toBe(false);
			expect(SeedRole.is("out")).toBe(false);
			expect(SeedRole.is("SOURCE")).toBe(false);
		});

		it("should reject numbers", (): void => {
			expect(SeedRole.is(0)).toBe(false);
			expect(SeedRole.is(1)).toBe(false);
		});

		it("should reject null and undefined", (): void => {
			expect(SeedRole.is(null)).toBe(false);
			expect(SeedRole.is(undefined)).toBe(false);
		});
	});
});

describe("Seed", () => {
	describe("valid values", () => {
		it("should accept object with id only", (): void => {
			expect(Seed.is({ id: "seed-1" })).toBe(true);
		});

		it("should accept object with id and source role", (): void => {
			expect(Seed.is({ id: "seed-1", role: "source" })).toBe(true);
		});

		it("should accept object with id and target role", (): void => {
			expect(Seed.is({ id: "seed-1", role: "target" })).toBe(true);
		});

		it("should accept object with id and bidirectional role", (): void => {
			expect(Seed.is({ id: "seed-1", role: "bidirectional" })).toBe(true);
		});
	});

	describe("invalid values", () => {
		it("should reject object without id", (): void => {
			expect(Seed.is({ role: "source" })).toBe(false);
		});

		it("should reject empty id", (): void => {
			expect(Seed.is({ id: "" })).toBe(false);
		});

		it("should reject invalid role", (): void => {
			expect(Seed.is({ id: "seed-1", role: "invalid" })).toBe(false);
		});

		it("should reject non-string id", (): void => {
			expect(Seed.is({ id: 123 })).toBe(false);
		});

		it("should reject null", (): void => {
			expect(Seed.is(null)).toBe(false);
		});

		it("should reject undefined", (): void => {
			expect(Seed.is(undefined)).toBe(false);
		});
	});
});

describe("ComputeBackend", () => {
	describe("valid values", () => {
		it("should accept 'cpu'", (): void => {
			expect(ComputeBackend.is("cpu")).toBe(true);
		});

		it("should accept 'gpu'", (): void => {
			expect(ComputeBackend.is("gpu")).toBe(true);
		});

		it("should accept 'auto'", (): void => {
			expect(ComputeBackend.is("auto")).toBe(true);
		});
	});

	describe("invalid values", () => {
		it("should reject other strings", (): void => {
			expect(ComputeBackend.is("CPU")).toBe(false);
			expect(ComputeBackend.is("webgpu")).toBe(false);
			expect(ComputeBackend.is("cuda")).toBe(false);
		});

		it("should reject numbers", (): void => {
			expect(ComputeBackend.is(0)).toBe(false);
			expect(ComputeBackend.is(1)).toBe(false);
		});

		it("should reject null and undefined", (): void => {
			expect(ComputeBackend.is(null)).toBe(false);
			expect(ComputeBackend.is(undefined)).toBe(false);
		});

		it("should reject boolean", (): void => {
			expect(ComputeBackend.is(true)).toBe(false);
			expect(ComputeBackend.is(false)).toBe(false);
		});
	});
});
