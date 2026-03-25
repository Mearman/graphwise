import { z } from "zod";

/**
 * Attach a `.is()` type guard to a Zod schema — single source of truth for type + validation.
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
