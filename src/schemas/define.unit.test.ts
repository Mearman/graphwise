import { describe, expect, it } from "vitest";
import { z } from "zod";
import { defineSchema, defineNamedSchema } from "./define";

describe("defineSchema", () => {
	describe("type guard", () => {
		it("should return true for valid values", (): void => {
			const schema = defineSchema(z.string());
			expect(schema.is("hello")).toBe(true);
		});

		it("should return false for invalid values", (): void => {
			const schema = defineSchema(z.string());
			expect(schema.is(123)).toBe(false);
		});

		it("should narrow type correctly with type guard", (): void => {
			const schema = defineSchema(z.number());
			const value: unknown = 42;

			if (schema.is(value)) {
				// TypeScript should narrow to number
				expect(value.toFixed(2)).toBe("42.00");
			}
		});

		it("should work with complex object schemas", (): void => {
			const schema = defineSchema(
				z.object({
					name: z.string(),
					age: z.number(),
				}),
			);

			expect(schema.is({ name: "Alice", age: 30 })).toBe(true);
			expect(schema.is({ name: "Bob" })).toBe(false);
			expect(schema.is(null)).toBe(false);
		});

		it("should work with union schemas", (): void => {
			const schema = defineSchema(z.union([z.string(), z.number()]));

			expect(schema.is("text")).toBe(true);
			expect(schema.is(42)).toBe(true);
			expect(schema.is(true)).toBe(false);
		});

		it("should work with array schemas", (): void => {
			const schema = defineSchema(z.array(z.string()));

			expect(schema.is(["a", "b", "c"])).toBe(true);
			expect(schema.is([])).toBe(true);
			expect(schema.is([1, 2, 3])).toBe(false);
		});

		it("should work with optional schemas", (): void => {
			const schema = defineSchema(z.object({ value: z.string().optional() }));

			expect(schema.is({ value: "present" })).toBe(true);
			expect(schema.is({})).toBe(true);
			expect(schema.is({ value: null })).toBe(false);
		});
	});

	describe("schema methods", () => {
		it("should preserve original schema parse method", (): void => {
			const schema = defineSchema(z.string().min(3));

			expect(schema.parse("hello")).toBe("hello");
			expect(() => schema.parse("hi")).toThrow();
		});

		it("should preserve original schema safeParse method", (): void => {
			const schema = defineSchema(z.string().min(3));

			const validResult = schema.safeParse("hello");
			expect(validResult.success).toBe(true);

			const invalidResult = schema.safeParse("hi");
			expect(invalidResult.success).toBe(false);
		});

		it("should preserve schema refinement", (): void => {
			const schema = defineSchema(
				z.number().refine((n) => n > 0, { message: "Must be positive" }),
			);

			expect(schema.is(5)).toBe(true);
			expect(schema.is(-1)).toBe(false);
		});

		it("should preserve schema transform", (): void => {
			const schema = defineSchema(z.string().toUpperCase());

			expect(schema.parse("hello")).toBe("HELLO");
		});
	});

	describe("edge cases", () => {
		it("should handle null correctly", (): void => {
			const schema = defineSchema(z.null());
			expect(schema.is(null)).toBe(true);
			expect(schema.is(undefined)).toBe(false);
		});

		it("should handle undefined correctly", (): void => {
			const schema = defineSchema(z.undefined());
			expect(schema.is(undefined)).toBe(true);
			expect(schema.is(null)).toBe(false);
		});

		it("should handle nullable schemas", (): void => {
			const schema = defineSchema(z.string().nullable());
			expect(schema.is("text")).toBe(true);
			expect(schema.is(null)).toBe(true);
			expect(schema.is(123)).toBe(false);
		});

		it("should handle literal schemas", (): void => {
			const schema = defineSchema(z.literal("exact"));
			expect(schema.is("exact")).toBe(true);
			expect(schema.is("other")).toBe(false);
		});

		it("should handle record schemas", (): void => {
			const schema = defineSchema(z.record(z.string(), z.number()));
			expect(schema.is({ a: 1, b: 2 })).toBe(true);
			expect(schema.is({ a: "not a number" })).toBe(false);
		});

		it("should handle tuple schemas", (): void => {
			const schema = defineSchema(z.tuple([z.string(), z.number()]));
			expect(schema.is(["hello", 42])).toBe(true);
			expect(schema.is(["hello", "world"])).toBe(false);
		});
	});
});

describe("defineNamedSchema", () => {
	describe("type guard", () => {
		it("should return true for valid values", (): void => {
			const schema = defineNamedSchema("MySchema", z.string());
			expect(schema.is("hello")).toBe(true);
		});

		it("should return false for invalid values", (): void => {
			const schema = defineNamedSchema("MySchema", z.string());
			expect(schema.is(123)).toBe(false);
		});

		it("should narrow type correctly with type guard", (): void => {
			const schema = defineNamedSchema("NumberSchema", z.number());
			const value: unknown = 42;

			if (schema.is(value)) {
				expect(value.toFixed(0)).toBe("42");
			}
		});
	});

	describe("typeName property", () => {
		it("should expose the provided type name", (): void => {
			const schema = defineNamedSchema("CustomType", z.string());
			expect(schema.typeName).toBe("CustomType");
		});

		it("should preserve typeName across different schema types", (): void => {
			const stringSchema = defineNamedSchema("StringType", z.string());
			const numberSchema = defineNamedSchema("NumberType", z.number());
			const objectSchema = defineNamedSchema(
				"ObjectType",
				z.object({ id: z.string() }),
			);

			expect(stringSchema.typeName).toBe("StringType");
			expect(numberSchema.typeName).toBe("NumberType");
			expect(objectSchema.typeName).toBe("ObjectType");
		});
	});

	describe("schema methods", () => {
		it("should preserve original schema parse method", (): void => {
			const schema = defineNamedSchema("MinString", z.string().min(3));

			expect(schema.parse("hello")).toBe("hello");
			expect(() => schema.parse("hi")).toThrow();
		});

		it("should preserve original schema safeParse method", (): void => {
			const schema = defineNamedSchema("Email", z.email());

			const validResult = schema.safeParse("test@example.com");
			expect(validResult.success).toBe(true);

			const invalidResult = schema.safeParse("not-an-email");
			expect(invalidResult.success).toBe(false);
		});
	});

	describe("edge cases", () => {
		it("should work with complex nested schemas", (): void => {
			const schema = defineNamedSchema(
				"Complex",
				z.object({
					id: z.uuid(),
					tags: z.array(z.string()),
					metadata: z.record(z.string(), z.unknown()),
				}),
			);

			expect(
				schema.is({
					id: "550e8400-e29b-41d4-a716-446655440000",
					tags: ["a", "b"],
					metadata: { key: "value" },
				}),
			).toBe(true);

			expect(schema.is({ id: "not-a-uuid" })).toBe(false);
		});

		it("should work with empty string type name", (): void => {
			const schema = defineNamedSchema("", z.string());
			expect(schema.typeName).toBe("");
			expect(schema.is("test")).toBe(true);
		});

		it("should work with special characters in type name", (): void => {
			const schema = defineNamedSchema("My-Type_123", z.boolean());
			expect(schema.typeName).toBe("My-Type_123");
			expect(schema.is(true)).toBe(true);
		});
	});
});
