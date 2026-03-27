import type { ExpansionAnimationFrame } from "./frame-types"

export interface CurvePoint {
	readonly frameIndex: number
	readonly pathCount: number
}

/**
 * Maps expansion animation frames to (frameIndex, pathCount) pairs.
 * pathCount is the cumulative number of paths discovered up to that frame.
 * Pure function — no store access.
 */
export function buildDiscoveryCurve(
	frames: readonly ExpansionAnimationFrame[],
): CurvePoint[] {
	return frames.map((f) => ({
		frameIndex: f.index,
		pathCount: f.discoveredPaths.length,
	}))
}
