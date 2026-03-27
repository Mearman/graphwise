/**
 * Colours assigned to pipeline columns by index.
 * Consistent across DiscoveryTimeline chart curves and ColumnMetrics sparklines.
 */
export const COLUMN_COLOURS = [
	"#4dabf7", // blue
	"#69db7c", // green
	"#ffa94d", // orange
	"#f783ac", // pink
	"#a9e34b", // lime
	"#74c0fc", // light blue
	"#da77f2", // violet
	"#ffd43b", // yellow
] as const satisfies readonly string[];

export function columnColour(index: number): string {
	const colour = COLUMN_COLOURS[index % COLUMN_COLOURS.length];
	// COLUMN_COLOURS.length > 0 and modulo keeps index in bounds
	return colour ?? "#4dabf7";
}
