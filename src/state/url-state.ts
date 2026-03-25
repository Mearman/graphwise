import pako from "pako";
import { z } from "zod";
import { defineSchema } from "../lib/define-schema";

// Short keys minimise JSON size before compression
const NodeSchema = z.object({
	i: z.string(),
	l: z.string().optional(),
	t: z.string().optional(),
	w: z.number().optional(),
});

const EdgeSchema = z.object({
	s: z.string(),
	t: z.string(),
	y: z.string().optional(),
	w: z.number().optional(),
});

const SeedSchema = z.object({
	i: z.string(),
	r: z.string().optional(),
});

export const SerialisedState = defineSchema(
	z.object({
		v: z.literal(1),
		g: z.object({
			d: z.boolean(),
			n: z.array(NodeSchema),
			e: z.array(EdgeSchema),
		}),
		s: z.array(SeedSchema),
		a: z.string().optional(),
		f: z.number().optional(),
		m: z.union([z.literal("t"), z.literal("e")]),
		ts: z.number().optional(),
		tb: z.string().optional(),
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
