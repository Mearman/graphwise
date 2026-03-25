/**
 * Unit tests for the comparison metrics module.
 *
 * Tests use minimal mock data to verify each metric function independently.
 */

import { describe, it, expect } from "vitest";
import {
	spearmanRho,
	kendallTau,
	scoreVariance,
	lengthBias,
	pathDiversity,
	hubPenaltyStrength,
	weakLinkSensitivity,
	subgraphDensity,
	coverageEfficiency,
	firstPathLatency,
	communitySpan,
} from "./metrics";
import type { ExpansionResult, ExpansionStats } from "../../expansion/types";
import type { PARSEResult, RankedPath } from "../../ranking/parse";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeStats(overrides?: Partial<ExpansionStats>): ExpansionStats {
	return {
		iterations: 10,
		nodesVisited: 5,
		edgesTraversed: 6,
		pathsFound: 2,
		durationMs: 1,
		algorithm: "test",
		termination: "exhausted",
		...overrides,
	};
}

function makeExpansionResult(
	overrides?: Partial<ExpansionResult>,
): ExpansionResult {
	return {
		paths: [],
		sampledNodes: new Set<string>(),
		sampledEdges: new Set<readonly [string, string]>(),
		visitedPerFrontier: [],
		stats: makeStats(),
		...overrides,
	};
}

function makeRankedPath(
	nodes: readonly string[],
	salience: number,
): RankedPath {
	const first = nodes[0] ?? "a";
	const last = nodes[nodes.length - 1] ?? "a";
	return {
		nodes,
		salience,
		fromSeed: { id: first },
		toSeed: { id: last },
	};
}

function makePARSEResult(paths: readonly RankedPath[]): PARSEResult {
	const saliences = paths.map((p) => p.salience);
	const n = saliences.length;
	const mean = n > 0 ? saliences.reduce((a, b) => a + b, 0) / n : 0;
	const sorted = [...saliences].sort((a, b) => a - b);
	return {
		paths,
		stats: {
			pathsRanked: n,
			meanSalience: mean,
			medianSalience: sorted[Math.floor(n / 2)] ?? 0,
			maxSalience: sorted[n - 1] ?? 0,
			minSalience: sorted[0] ?? 0,
			durationMs: 0,
		},
	};
}

// ---------------------------------------------------------------------------
// spearmanRho
// ---------------------------------------------------------------------------

describe("spearmanRho", () => {
	it("returns 1 for identical rankings", () => {
		const ranking = ["A", "B", "C", "D"];
		expect(spearmanRho(ranking, ranking)).toBeCloseTo(1, 5);
	});

	it("returns -1 for fully reversed rankings", () => {
		const a = ["A", "B", "C", "D"];
		const b = ["D", "C", "B", "A"];
		expect(spearmanRho(a, b)).toBeCloseTo(-1, 5);
	});

	it("returns 0 for empty rankings", () => {
		expect(spearmanRho([], [])).toBe(0);
	});

	it("considers only common nodes", () => {
		const a = ["A", "B", "C"];
		const b = ["C", "B", "X"];
		// Only B and C are in common: B is rank 2 in a, rank 2 in b; C is rank 3 in a, rank 1 in b
		const rho = spearmanRho(a, b);
		expect(rho).toBeGreaterThanOrEqual(-1);
		expect(rho).toBeLessThanOrEqual(1);
	});
});

// ---------------------------------------------------------------------------
// kendallTau
// ---------------------------------------------------------------------------

describe("kendallTau", () => {
	it("returns 1 for identical rankings", () => {
		const ranking = ["A", "B", "C", "D"];
		expect(kendallTau(ranking, ranking)).toBeCloseTo(1, 5);
	});

	it("returns -1 for fully reversed rankings", () => {
		const a = ["A", "B", "C"];
		const b = ["C", "B", "A"];
		expect(kendallTau(a, b)).toBeCloseTo(-1, 5);
	});

	it("returns 0 for empty rankings", () => {
		expect(kendallTau([], [])).toBe(0);
	});

	it("returns 1 for a single common node", () => {
		expect(kendallTau(["A"], ["A"])).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// scoreVariance
// ---------------------------------------------------------------------------

describe("scoreVariance", () => {
	it("returns 0 for uniform scores", () => {
		const result = makePARSEResult([
			makeRankedPath(["A", "B"], 0.5),
			makeRankedPath(["C", "D"], 0.5),
			makeRankedPath(["E", "F"], 0.5),
		]);
		expect(scoreVariance(result)).toBeCloseTo(0, 10);
	});

	it("returns positive value for varied scores", () => {
		const result = makePARSEResult([
			makeRankedPath(["A", "B"], 0.1),
			makeRankedPath(["C", "D"], 0.5),
			makeRankedPath(["E", "F"], 0.9),
		]);
		expect(scoreVariance(result)).toBeGreaterThan(0);
	});

	it("returns 0 for a single path", () => {
		const result = makePARSEResult([makeRankedPath(["A", "B"], 0.7)]);
		expect(scoreVariance(result)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// pathDiversity
// ---------------------------------------------------------------------------

describe("pathDiversity", () => {
	it("counts unique intermediate nodes", () => {
		const result = makeExpansionResult({
			paths: [
				{ nodes: ["A", "B", "C"], fromSeed: { id: "A" }, toSeed: { id: "C" } },
				{ nodes: ["A", "D", "C"], fromSeed: { id: "A" }, toSeed: { id: "C" } },
			],
		});
		// Intermediates: B, D
		expect(pathDiversity(result)).toBe(2);
	});

	it("deduplicates shared intermediates across paths", () => {
		const result = makeExpansionResult({
			paths: [
				{ nodes: ["A", "B", "C"], fromSeed: { id: "A" }, toSeed: { id: "C" } },
				{ nodes: ["X", "B", "Y"], fromSeed: { id: "X" }, toSeed: { id: "Y" } },
			],
		});
		// Both paths share B as intermediate → diversity = 1
		expect(pathDiversity(result)).toBe(1);
	});

	it("returns 0 for paths with no intermediates", () => {
		const result = makeExpansionResult({
			paths: [
				{ nodes: ["A", "B"], fromSeed: { id: "A" }, toSeed: { id: "B" } },
			],
		});
		expect(pathDiversity(result)).toBe(0);
	});

	it("returns 0 when no paths found", () => {
		const result = makeExpansionResult({ paths: [] });
		expect(pathDiversity(result)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// hubPenaltyStrength
// ---------------------------------------------------------------------------

describe("hubPenaltyStrength", () => {
	it("returns value below 1 when hub scores lower than peripheral", () => {
		expect(hubPenaltyStrength(0.8, 0.4)).toBeCloseTo(0.5, 5);
	});

	it("returns 1 when hub and peripheral scores are equal", () => {
		expect(hubPenaltyStrength(0.5, 0.5)).toBeCloseTo(1, 5);
	});

	it("returns 1 when both are zero", () => {
		expect(hubPenaltyStrength(0, 0)).toBe(1);
	});

	it("returns Infinity when peripheral is 0 and hub is positive", () => {
		expect(hubPenaltyStrength(0, 0.5)).toBe(Infinity);
	});
});

// ---------------------------------------------------------------------------
// weakLinkSensitivity
// ---------------------------------------------------------------------------

describe("weakLinkSensitivity", () => {
	it("returns value below 1 when consistent path scores higher", () => {
		expect(weakLinkSensitivity(0.8, 0.4)).toBeCloseTo(0.5, 5);
	});

	it("returns 1 when both scores are equal", () => {
		expect(weakLinkSensitivity(0.5, 0.5)).toBeCloseTo(1, 5);
	});

	it("returns 1 when both are zero", () => {
		expect(weakLinkSensitivity(0, 0)).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// subgraphDensity
// ---------------------------------------------------------------------------

describe("subgraphDensity", () => {
	it("returns edges/nodes ratio", () => {
		const result = makeExpansionResult({
			sampledNodes: new Set(["A", "B", "C", "D"]),
			sampledEdges: new Set<readonly [string, string]>([
				["A", "B"] as const,
				["B", "C"] as const,
			]),
		});
		expect(subgraphDensity(result)).toBeCloseTo(2 / 4, 5);
	});

	it("returns 0 for empty result", () => {
		expect(subgraphDensity(makeExpansionResult())).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// coverageEfficiency
// ---------------------------------------------------------------------------

describe("coverageEfficiency", () => {
	it("returns paths/nodesVisited ratio", () => {
		const result = makeExpansionResult({
			paths: [
				{ nodes: ["A", "B"], fromSeed: { id: "A" }, toSeed: { id: "B" } },
				{ nodes: ["C", "D"], fromSeed: { id: "C" }, toSeed: { id: "D" } },
			],
			stats: makeStats({ nodesVisited: 10 }),
		});
		expect(coverageEfficiency(result)).toBeCloseTo(0.2, 5);
	});

	it("returns 0 when no nodes visited", () => {
		const result = makeExpansionResult({
			stats: makeStats({ nodesVisited: 0 }),
		});
		expect(coverageEfficiency(result)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// firstPathLatency
// ---------------------------------------------------------------------------

describe("firstPathLatency", () => {
	it("returns iterations/paths ratio", () => {
		const result = makeExpansionResult({
			paths: [
				{ nodes: ["A", "B"], fromSeed: { id: "A" }, toSeed: { id: "B" } },
			],
			stats: makeStats({ iterations: 20 }),
		});
		expect(firstPathLatency(result)).toBeCloseTo(20, 5);
	});

	it("returns Infinity when no paths found", () => {
		const result = makeExpansionResult({
			paths: [],
			stats: makeStats({ iterations: 20 }),
		});
		expect(firstPathLatency(result)).toBe(Infinity);
	});
});

// ---------------------------------------------------------------------------
// communitySpan
// ---------------------------------------------------------------------------

describe("communitySpan", () => {
	it("returns 1 when all path nodes are in the same component", () => {
		const result = makeExpansionResult({
			sampledNodes: new Set(["A", "B", "C"]),
			sampledEdges: new Set<readonly [string, string]>([
				["A", "B"] as const,
				["B", "C"] as const,
			]),
			paths: [
				{ nodes: ["A", "B", "C"], fromSeed: { id: "A" }, toSeed: { id: "C" } },
			],
		});
		expect(communitySpan(result)).toBe(1);
	});

	it("returns 2 when path nodes span two components", () => {
		const result = makeExpansionResult({
			sampledNodes: new Set(["A", "B", "C", "D"]),
			sampledEdges: new Set<readonly [string, string]>([
				["A", "B"] as const,
				["C", "D"] as const,
			]),
			paths: [
				{ nodes: ["A", "B"], fromSeed: { id: "A" }, toSeed: { id: "B" } },
				{ nodes: ["C", "D"], fromSeed: { id: "C" }, toSeed: { id: "D" } },
			],
		});
		expect(communitySpan(result)).toBe(2);
	});

	it("returns 0 when no paths found", () => {
		const result = makeExpansionResult({ paths: [] });
		expect(communitySpan(result)).toBe(0);
	});
});

// ---------------------------------------------------------------------------
// lengthBias
// ---------------------------------------------------------------------------

describe("lengthBias", () => {
	it("returns 0 for a single path", () => {
		const result = makePARSEResult([makeRankedPath(["A", "B", "C"], 0.7)]);
		expect(lengthBias(result)).toBe(0);
	});

	it("returns positive correlation when longer paths score higher", () => {
		// Deliberately construct: longer path → higher salience
		const result = makePARSEResult([
			makeRankedPath(["A", "B"], 0.2), // length 1
			makeRankedPath(["A", "B", "C"], 0.5), // length 2
			makeRankedPath(["A", "B", "C", "D"], 0.9), // length 3
		]);
		expect(lengthBias(result)).toBeGreaterThan(0);
	});

	it("returns negative correlation when shorter paths score higher", () => {
		const result = makePARSEResult([
			makeRankedPath(["A", "B"], 0.9), // length 1
			makeRankedPath(["A", "B", "C"], 0.5), // length 2
			makeRankedPath(["A", "B", "C", "D"], 0.1), // length 3
		]);
		expect(lengthBias(result)).toBeLessThan(0);
	});
});
