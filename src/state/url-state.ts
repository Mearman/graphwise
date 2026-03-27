import pako from "pako";
import { z } from "zod";
import { defineSchema } from "../lib/define-schema";

// Short keys minimise JSON size before compression
const NodeSchema = z.object({
	i: z.string().describe("Node ID"),
	l: z.string().optional().describe("Display label"),
	t: z.string().optional().describe("Node type"),
	w: z.number().optional().describe("Node weight"),
});

const EdgeSchema = z.object({
	s: z.string().describe("Source node ID"),
	t: z.string().describe("Target node ID"),
	y: z.string().optional().describe("Edge type"),
	w: z.number().optional().describe("Edge weight"),
});

const SeedSchema = z.object({
	i: z.string().describe("Seed node ID"),
	r: z
		.string()
		.optional()
		.describe("Seed role (source, target, bidirectional)"),
});

const ColumnConfigSchema = z.object({
	id: z.string().describe("Column ID"),
	a: z.string().optional().describe("Expansion algorithm"),
	sk: z.string().optional().describe("Sort key (ranking)"),
	mi: z.string().optional().describe("MI variant (jaccard, etc.)"),
	ra: z.string().optional().describe("Ranking algorithm (parse, etc.)"),
});

const GraphSchema = z.object({
	d: z.boolean().describe("Whether the graph is directed"),
	n: z.array(NodeSchema).describe("Graph nodes"),
	e: z.array(EdgeSchema).describe("Graph edges"),
});

const SerialisedState = defineSchema(
	z.object({
		v: z.literal(2).describe("Schema version"),
		g: GraphSchema.describe("Graph structure"),
		s: z.array(SeedSchema).describe("Seed nodes for expansion"),
		c: z.array(ColumnConfigSchema).describe("Column configurations"),
		f: z.number().optional().describe("Current animation frame index"),
		vm: z.string().optional().describe("View mode (columns or overlay)"),
		fx: z.string().optional().describe("Selected fixture name"),
		nc: z.number().optional().describe("Node count for random graphs"),
		gs: z.number().optional().describe("Generation seed for random graphs"),
		gc: z.number().optional().describe("Graph class bitmask"),
		ze: z.boolean().optional().describe("Zoom enabled"),
		pe: z.boolean().optional().describe("Pan enabled"),
		sp: z.number().optional().describe("Playback speed"),
		ml: z.number().optional().describe("Max iterations (0 = unlimited)"),
	}),
);

export type SerialisedState = z.infer<typeof SerialisedState>;

/** Convert bytes to base64url string */
function bytesToBase64url(bytes: Uint8Array): string {
	const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

/** Convert base64url string to bytes */
function base64urlToBytes(str: string): Uint8Array {
	const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
	const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
	const binary = atob(padded);
	return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

/** Serialise state to URL hash */
export function serialiseToHash(state: SerialisedState): string {
	const json = JSON.stringify(state);
	const compressed = pako.deflate(json);
	return "#data=" + bytesToBase64url(compressed);
}

/** Deserialise state from URL hash, returns null if missing or unrecognised format */
export function deserialiseFromHash(): SerialisedState | null {
	const hash = window.location.hash;
	if (!hash.startsWith("#data=")) return null;
	const encoded = hash.slice("#data=".length);
	if (encoded.length === 0) return null;

	try {
		const bytes = base64urlToBytes(encoded);
		const json: unknown = JSON.parse(pako.inflate(bytes, { to: "string" }));
		return SerialisedState.is(json) ? json : null;
	} catch {
		return null;
	}
}

/** Update the URL hash without triggering navigation */
export function updateHash(state: SerialisedState): void {
	window.history.replaceState(null, "", serialiseToHash(state));
}

/** Subscribe to hash changes */
export function onHashChange(
	callback: (state: SerialisedState | null) => void,
): () => void {
	const handler = (): void => {
		callback(deserialiseFromHash());
	};
	window.addEventListener("hashchange", handler);
	return () => {
		window.removeEventListener("hashchange", handler);
	};
}
