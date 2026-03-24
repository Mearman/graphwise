import { z } from "zod";

/**
 * Attach a type guard directly to a Zod schema.
 *
 * This keeps the runtime validator, the inferred TypeScript type,
 * and the runtime type guard derived from the same source.
 */
export function defineSchema<T extends z.ZodType>(
	schema: T,
): T & { is(value: unknown): value is z.infer<T> } {
	return Object.assign(schema, {
		is(value: unknown): value is z.infer<T> {
			return schema.safeParse(value).success;
		},
	});
}

/**
 * Create a schema with a custom type guard name for better error messages.
 */
export function defineNamedSchema<T extends z.ZodType>(
	name: string,
	schema: T,
): T & { is(value: unknown): value is z.infer<T>; typeName: string } {
	return Object.assign(schema, {
		is(value: unknown): value is z.infer<T> {
			return schema.safeParse(value).success;
		},
		typeName: name,
	});
}
