import type { NodeSingular } from "cytoscape";

/**
 * Relaxed stylesheet type for Cytoscape.
 * The official Cytoscape types are incomplete and don't include all valid
 * CSS properties. This relaxed type allows any valid Cytoscape style properties.
 */
export interface RelaxedStylesheet {
	readonly selector: string;
	readonly style: Record<string, unknown>;
}

/** Colour scheme type */
export type ColorScheme = "light" | "dark";

/** Theme-aware colour constants */
const LIGHT_COLOURS = {
	nodeBorder: "#1e293b",
	nodeText: "#1e293b",
	edgeDefault: "#cbd5e1",
} as const;

const DARK_COLOURS = {
	nodeBorder: "#e2e8f0",
	nodeText: "#f1f5f9",
	edgeDefault: "#475569",
} as const;

/** Semantic colours (same in both themes) */
export const SEED_SOURCE = "#10b981";
export const SEED_TARGET = "#f59e0b";
export const SEED_BIDIRECTIONAL = "#6366f1";
export const NODE_DEFAULT = "#64748b";
export const NODE_VISITED = "#3b82f6";
export const NODE_FRONTIER = "#8b5cf6";
export const NODE_EXPANDED = "#f97316";
export const EDGE_VISITED = "#3b82f6";
export const PATH_HIGHLIGHT = "#ec4899";

/** Valid seed roles */
type SeedRole = "source" | "target" | "bidirectional";

/** Helper to check if a value is a valid seed role */
function isSeedRole(value: unknown): value is SeedRole {
	return value === "source" || value === "target" || value === "bidirectional";
}

/** Helper to get seed role colour */
function getSeedRoleColour(seedRole: unknown): string {
	if (!isSeedRole(seedRole)) return NODE_DEFAULT;
	if (seedRole === "source") return SEED_SOURCE;
	if (seedRole === "target") return SEED_TARGET;
	return SEED_BIDIRECTIONAL;
}

/** Helper to normalise weight for node sizing */
function getNormalisedWeight(weight: number): number {
	return Math.max(0.5, Math.min(1, weight));
}

/** Create Cytoscape styles based on graph direction and colour scheme */
export function createStyles(
	directed: boolean,
	colorScheme: ColorScheme = "light",
): readonly RelaxedStylesheet[] {
	const colours = colorScheme === "dark" ? DARK_COLOURS : LIGHT_COLOURS;
	const canvasBg = colorScheme === "dark" ? "#1e293b" : "#ffffff";

	return [
		{
			selector: "core",
			style: {
				"background-color": canvasBg,
			},
		},
		{
			selector: "node",
			style: {
				backgroundColor: function (ele: NodeSingular): string {
					return getSeedRoleColour(ele.data("seedRole"));
				},
				borderColor: colours.nodeBorder,
				borderWidth: 2,
				color: colours.nodeText,
				label: "data(label)",
				fontSize: 10,
				textValign: "bottom",
				textHalign: "center",
				textMarginY: 4,
				width: function (ele: NodeSingular): number {
					const weight = Number(ele.data("weight"));
					const normalised = getNormalisedWeight(
						Number.isNaN(weight) ? 1 : weight,
					);
					return 20 + normalised * 30;
				},
				height: function (ele: NodeSingular): number {
					const weight = Number(ele.data("weight"));
					const normalised = getNormalisedWeight(
						Number.isNaN(weight) ? 1 : weight,
					);
					return 20 + normalised * 30;
				},
			},
		},
		{
			selector: "node.visited",
			style: {
				backgroundColor: NODE_VISITED,
			},
		},
		{
			selector: "node.frontier",
			style: {
				backgroundColor: NODE_FRONTIER,
			},
		},
		{
			selector: "node.expanded",
			style: {
				backgroundColor: NODE_EXPANDED,
				borderColor: NODE_EXPANDED,
				borderWidth: 3,
			},
		},
		{
			selector: "node.highlighted",
			style: {
				borderColor: PATH_HIGHLIGHT,
				borderWidth: 4,
			},
		},
		{
			selector: "edge",
			style: {
				curveStyle: directed ? "bezier" : "haystack",
				width: 2,
				lineColor: colours.edgeDefault,
				...(directed
					? {
							targetArrowColor: colours.edgeDefault,
							targetArrowShape: "triangle",
							arrowScale: 0.8,
						}
					: {}),
			},
		},
		{
			selector: "edge.visited",
			style: {
				lineColor: EDGE_VISITED,
				width: 2,
				...(directed
					? {
							targetArrowColor: EDGE_VISITED,
						}
					: {}),
			},
		},
		{
			selector: "edge.highlighted",
			style: {
				lineColor: PATH_HIGHLIGHT,
				width: 3,
				...(directed
					? {
							targetArrowColor: PATH_HIGHLIGHT,
						}
					: {}),
			},
		},
	];
}
