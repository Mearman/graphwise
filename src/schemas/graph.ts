import { z } from "zod";
import { defineSchema } from "./define";

/**
 * Node identifier - a string representing a unique node in the graph.
 */
export const NodeId = defineSchema(z.string().min(1));
export type NodeId = z.infer<typeof NodeId>;

/**
 * Direction for traversing edges in a graph.
 */
export const Direction = defineSchema(
	z.union([z.literal("in"), z.literal("out"), z.literal("both")]),
);
export type Direction = z.infer<typeof Direction>;

/**
 * Base node data structure.
 */
export const NodeData = defineSchema(
	z.object({
		id: NodeId,
		type: z.string().optional(),
		weight: z.number().nonnegative().optional(),
	}),
);
export type NodeData = z.infer<typeof NodeData>;

/**
 * Base edge data structure.
 */
export const EdgeData = defineSchema(
	z.object({
		source: NodeId,
		target: NodeId,
		weight: z.number().nonnegative().optional(),
		type: z.string().optional(),
	}),
);
export type EdgeData = z.infer<typeof EdgeData>;

/**
 * Seed role in multi-seed expansion.
 */
export const SeedRole = defineSchema(
	z.union([
		z.literal("source"),
		z.literal("target"),
		z.literal("bidirectional"),
	]),
);
export type SeedRole = z.infer<typeof SeedRole>;

/**
 * A seed node with optional role classification.
 */
export const Seed = defineSchema(
	z.object({
		id: NodeId,
		role: SeedRole.optional(),
	}),
);
export type Seed = z.infer<typeof Seed>;

/**
 * Compute backend selection.
 */
export const ComputeBackend = defineSchema(
	z.union([z.literal("cpu"), z.literal("gpu"), z.literal("auto")]),
);
export type ComputeBackend = z.infer<typeof ComputeBackend>;
