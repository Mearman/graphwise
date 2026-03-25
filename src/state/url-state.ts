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
	r: z.string().optional().describe("Seed role (source, target, bidirectional)"),
});

export const SerialisedState = defineSchema(
	z.object({
		v: z.literal(1).describe("Schema version"),
		g: z.object({
			d: z.boolean().describe("Whether the graph is directed"),
			n: z.array(NodeSchema).describe("Graph nodes"),
			e: z.array(EdgeSchema).describe("Graph edges"),
		}).describe("Graph structure"),
		s: z.array(SeedSchema).describe("Seed nodes for expansion"),
		a: z.string().optional().describe("Selected algorithm name"),
		f: z.number().optional().describe("Current animation frame index"),
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

/** Deserialise state from URL hash */
export function deserialiseFromHash(): SerialisedState | null {
	const hash = window.location.hash;
	if (!hash.startsWith("#data=")) return null;
	const encoded = hash.slice("#data=".length);
	if (encoded.length === 0) return null;

	try {
		const bytes = base64urlToBytes(encoded);
		const json: unknown = JSON.parse(pako.inflate(bytes, { to: "string" }));
		if (SerialisedState.is(json)) return json;
		return null;
	} catch {
		return null;
	}
}

/** Update the URL hash without triggering navigation */
export function updateHash(state: SerialisedState): void {
	const hash = serialiseToHash(state);
	window.history.replaceState(null, "", hash);
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
