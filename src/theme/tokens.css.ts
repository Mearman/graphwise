/**
 * Design tokens for the application.
 *
 * For theme-aware colours, prefer using Mantine's CSS variables directly:
 * - `var(--mantine-color-{color}-{shade})` e.g., `var(--mantine-color-gray-1)`
 * - `var(--mantine-color-body)`, `var(--mantine-color-text)`
 *
 * These tokens are for graph-semantic colours that don't change with theme.
 */

/** Graph semantic colour tokens (algorithm-specific, not theme-dependent) */
export const graphColours = {
	// Seed roles
	seedSource: "#10b981",
	seedTarget: "#f59e0b",
	seedBidirectional: "#6366f1",
	// Algorithm states
	nodeDefault: "#64748b",
	nodeVisited: "#3b82f6",
	nodeFrontier: "#8b5cf6",
	nodeExpanded: "#f97316",
	edgeDefault: "#cbd5e1",
	edgeVisited: "#3b82f6",
	pathHighlight: "#ec4899",
} as const;

/** Spacing tokens */
export const space = {
	xs: "4px",
	sm: "8px",
	md: "16px",
	lg: "24px",
	xl: "32px",
} as const;

/** Border radius tokens */
export const radius = {
	sm: "4px",
	md: "8px",
	lg: "12px",
} as const;

/** Font size tokens */
export const fontSize = {
	xs: "12px",
	sm: "14px",
	md: "16px",
	lg: "18px",
	xl: "24px",
} as const;

/**
 * Legacy tokens export for backwards compatibility.
 * @deprecated Use Mantine CSS variables or specific token exports above.
 */
export const tokens = {
	colour: graphColours,
	space,
	radius,
	fontSize,
};
