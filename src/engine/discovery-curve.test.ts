import { describe, it, expect } from "vitest"
import { buildDiscoveryCurve } from "./discovery-curve"
import type { ExpansionAnimationFrame } from "./frame-types"

function makeFrame(index: number, pathCount: number): ExpansionAnimationFrame {
	return {
		index,
		iteration: index,
		activeFrontier: 0,
		expandedNode: "n0",
		expandedNeighbours: [],
		visitedNodes: new Map(),
		frontierQueues: [],
		frontierSizes: [],
		discoveredPaths: Array.from({ length: pathCount }, (_, i) => ({
			fromSeed: { id: "s0" },
			toSeed: { id: "s1" },
			nodes: [`n${String(i)}`, `n${String(i + 1)}`],
		})) as ExpansionAnimationFrame["discoveredPaths"],
		edgesTraversed: 0,
		newPathDiscovered: null,
		phaseTransition: null,
	}
}

describe("buildDiscoveryCurve", () => {
	it("returns an empty array for empty frames", () => {
		expect(buildDiscoveryCurve([])).toEqual([])
	})

	it("maps each frame to frameIndex + pathCount", () => {
		const frames = [makeFrame(0, 0), makeFrame(1, 3), makeFrame(2, 7)]
		expect(buildDiscoveryCurve(frames)).toEqual([
			{ frameIndex: 0, pathCount: 0 },
			{ frameIndex: 1, pathCount: 3 },
			{ frameIndex: 2, pathCount: 7 },
		])
	})

	it("uses frame.index (not array position) as frameIndex", () => {
		const frames = [makeFrame(5, 2), makeFrame(10, 5)]
		const result = buildDiscoveryCurve(frames)
		expect(result[0]?.frameIndex).toBe(5)
		expect(result[1]?.frameIndex).toBe(10)
	})
})
