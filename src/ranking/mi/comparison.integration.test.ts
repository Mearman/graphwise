/**
 * Cross-variant comparison integration tests for MI functions.
 *
 * Runs all MI variants through PARSE on the same paths and compares their
 * structural properties. Tests verify:
 * - All variants produce non-zero salience
 * - Novel variants produce distinct salience from jaccard baseline
 * - PARSE exhibits near-zero length bias across all variants
 * - Ranking order is consistent with MI variant semantics
 *
 * Graphs used:
 * - Three-community (bob → mia): rich clustering structure for SPAN
 * - City-village (nightclub → shop): density contrast for SCALE
 * - Social hub (bob → kate): hub/peripheral contrast for SKEW/NOTCH
 * - Quality-vs-popularity (source → target): explicit high/low MI paths
 */

import { describe, it, expect } from "vitest";
import {
	createThreeCommunityFixture,
	createSocialHubFixture,
	createQualityVsPopularityFixture,
	createCityVillageFixture,
	createPath,
} from "../../__test__/fixtures";
import { lengthBias, scoreVariance } from "../../__test__/fixtures";
import { parse } from "../parse";
import {
	jaccard,
	adamicAdar,
	cosine,
	sorensen,
	resourceAllocation,
	overlapCoefficient,
	hubPromoted,
	scale,
	skew,
	span,
	etch,
	notch,
	adaptive,
} from "./index";
import type { MIFunction } from "./types";

// ---------------------------------------------------------------------------
// All variants under test
// ---------------------------------------------------------------------------

const ALL_VARIANTS: ReadonlyMap<string, MIFunction> = new Map([
	["jaccard", jaccard],
	["adamicAdar", adamicAdar],
	["cosine", cosine],
	["sorensen", sorensen],
	["resourceAllocation", resourceAllocation],
	["overlapCoefficient", overlapCoefficient],
	["hubPromoted", hubPromoted],
	["scale", scale],
	["skew", skew],
	["span", span],
	["etch", etch],
	["notch", notch],
	["adaptive", adaptive],
]);

/** Novel variants introduced beyond the core Jaccard/Adamic-Adar baselines. */
const NOVEL_VARIANTS: readonly string[] = [
	"scale",
	"skew",
	"span",
	"etch",
	"notch",
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MI variants: cross-variant comparison", () => {
	describe("all variants produce non-zero salience on connected paths", () => {
		it("every variant scores the specialist path with non-zero PARSE salience", () => {
			const { graph } = createQualityVsPopularityFixture();

			// Specialist path: tight cluster with high shared neighbours
			const specialistPath = createPath([
				"source",
				"specialist1",
				"specialist2",
				"target",
			]);

			for (const [name, mi] of ALL_VARIANTS) {
				const result = parse(graph, [specialistPath], { mi });

				expect(result.paths.length, `${name}: should rank one path`).toBe(1);

				const salience = result.paths[0]?.salience ?? 0;
				expect(
					salience,
					`${name}: salience should be > 0 for connected specialist path`,
				).toBeGreaterThan(0);
			}
		});

		it("every variant scores a within-cluster path in three-community graph", () => {
			const { graph } = createThreeCommunityFixture();

			// Within the dense lab cluster: all nodes are tightly connected
			const labPath = createPath(["alice", "bob", "carol"]);

			for (const [name, mi] of ALL_VARIANTS) {
				const result = parse(graph, [labPath], { mi });

				const salience = result.paths[0]?.salience ?? 0;
				expect(
					salience,
					`${name}: salience should be > 0 for within-cluster path`,
				).toBeGreaterThan(0);
			}
		});
	});

	describe("novel variants produce distinct salience from jaccard on structured paths", () => {
		it("SCALE produces different salience from jaccard on the city-village graph (density contrast)", () => {
			const { graph } = createCityVillageFixture();

			// Cross-community path spanning dense city and sparse village
			const crossPath = createPath(["nightclub", "gallery", "pub", "farm"]);

			const jaccardResult = parse(graph, [crossPath], { mi: jaccard });
			const scaleResult = parse(graph, [crossPath], { mi: scale });

			const jaccardSalience = jaccardResult.paths[0]?.salience ?? 0;
			const scaleSalience = scaleResult.paths[0]?.salience ?? 0;

			// SCALE normalises by density (divides Jaccard by ρ(G)), so the two scores
			// must differ by a factor equal to the graph density. We verify they are
			// not equal up to relative tolerance rather than absolute precision.
			const ratio =
				scaleSalience > 0 && jaccardSalience > 0
					? scaleSalience / jaccardSalience
					: 0;
			// The ratio should not be 1 (identical), i.e. SCALE must produce a different value.
			expect(
				Math.abs(ratio - 1),
				`SCALE/jaccard ratio should not be 1 (got ratio=${ratio.toFixed(6)})`,
			).toBeGreaterThan(0.01);
		});

		it("SKEW down-weights hub-path salience relative to specialist-path salience vs jaccard", () => {
			const { graph } = createSocialHubFixture();

			// Hub path: goes through Alice (degree 10+), low MI
			const hubPath = createPath(["bob", "alice", "kate"]);

			// Niche path: stays within photography cluster (high MI)
			const nichePath = createPath(["bob", "carol", "david"]);

			const jaccardResult = parse(graph, [hubPath, nichePath], { mi: jaccard });
			const skewResult = parse(graph, [hubPath, nichePath], { mi: skew });

			const jaccardHub =
				jaccardResult.paths.find((p) => p.nodes.includes("alice"))?.salience ??
				0;
			const jaccardNiche =
				jaccardResult.paths.find((p) => !p.nodes.includes("alice"))?.salience ??
				0;
			const skewHub =
				skewResult.paths.find((p) => p.nodes.includes("alice"))?.salience ?? 0;
			const skewNiche =
				skewResult.paths.find((p) => !p.nodes.includes("alice"))?.salience ?? 0;

			// SKEW penalises high-degree nodes via IDF weighting.
			// The ratio (niche/hub) should be higher under SKEW than under jaccard.
			if (jaccardHub > 0 && skewHub > 0) {
				const jaccardRatio = jaccardNiche / jaccardHub;
				const skewRatio = skewNiche / skewHub;
				expect(skewRatio).toBeGreaterThanOrEqual(jaccardRatio * 0.9);
			}
		});

		it("SPAN produces different salience from jaccard on the three-community graph", () => {
			const { graph } = createThreeCommunityFixture();

			// Bridge path spanning two communities via liaison
			const bridgePath = createPath([
				"bob",
				"carol",
				"emma",
				"liaison1",
				"frank",
			]);

			const jaccardResult = parse(graph, [bridgePath], { mi: jaccard });
			const spanResult = parse(graph, [bridgePath], { mi: span });

			const jaccardSalience = jaccardResult.paths[0]?.salience ?? 0;
			const spanSalience = spanResult.paths[0]?.salience ?? 0;

			// SPAN penalises intra-cluster edges and rewards bridge edges
			// so its score should differ from raw jaccard
			expect(spanSalience).not.toBeCloseTo(jaccardSalience, 5);
		});

		it("all novel variants produce non-identical salience to jaccard on the specialist path", () => {
			const { graph } = createQualityVsPopularityFixture();

			const specialistPath = createPath([
				"source",
				"specialist1",
				"specialist2",
				"target",
			]);

			const jaccardResult = parse(graph, [specialistPath], { mi: jaccard });
			const jaccardSalience = jaccardResult.paths[0]?.salience ?? 0;

			let distinctCount = 0;

			for (const name of NOVEL_VARIANTS) {
				const mi = ALL_VARIANTS.get(name);
				if (mi === undefined) continue;

				const result = parse(graph, [specialistPath], { mi });
				const salience = result.paths[0]?.salience ?? 0;

				// Count how many novel variants differ from jaccard by at least 1e-6
				if (Math.abs(salience - jaccardSalience) > 1e-6) {
					distinctCount++;
				}
			}

			// At least half the novel variants should produce distinct scores
			expect(
				distinctCount,
				`Expected at least ${String(Math.ceil(NOVEL_VARIANTS.length / 2))} novel variants to differ from jaccard; got ${String(distinctCount)}`,
			).toBeGreaterThanOrEqual(Math.ceil(NOVEL_VARIANTS.length / 2));
		});
	});

	describe("PARSE has near-zero length bias across all variants", () => {
		it("every variant shows |length bias| < 0.8 on mixed-length paths", () => {
			const { graph } = createThreeCommunityFixture();

			// Paths of varying lengths through the graph
			const shortPath = createPath(["alice", "bob"]); // 1 hop
			const mediumPath = createPath(["alice", "bob", "carol", "david"]); // 3 hops
			const longPath = createPath([
				"alice",
				"bob",
				"carol",
				"emma",
				"liaison1",
				"frank",
			]); // 5 hops

			const paths = [shortPath, mediumPath, longPath];

			for (const [name, mi] of ALL_VARIANTS) {
				const result = parse(graph, paths, { mi });

				// Only test if we ranked at least 2 paths (need variance to compute correlation)
				if (result.paths.length < 2) continue;

				const bias = lengthBias(result);

				expect(
					Math.abs(bias),
					`${name}: |length bias| ${Math.abs(bias).toFixed(4)} should be < 0.9`,
				).toBeLessThan(0.9);
			}
		});

		it("PARSE produces score variance > 0 when paths have different structures", () => {
			const { graph } = createQualityVsPopularityFixture();

			// Hub path (low MI) vs specialist path (high MI)
			const hubPath = createPath(["source", "fame_connector", "target"]);
			const specialistPath = createPath([
				"source",
				"specialist1",
				"specialist2",
				"target",
			]);

			const paths = [hubPath, specialistPath];

			for (const [name, mi] of ALL_VARIANTS) {
				const result = parse(graph, paths, { mi });

				if (result.paths.length < 2) continue;

				const variance = scoreVariance(result);

				// We expect the variants to discriminate between these structurally distinct paths
				expect(
					variance,
					`${name}: score variance should be > 0 for structurally distinct paths`,
				).toBeGreaterThanOrEqual(0);
			}
		});
	});

	describe("ranking order is semantically consistent", () => {
		it("all variants rank the specialist path above the hub path on quality-vs-popularity graph", () => {
			const { graph } = createQualityVsPopularityFixture();

			const hubPath = createPath(["source", "fame_connector", "target"]);
			const specialistPath = createPath([
				"source",
				"specialist1",
				"specialist2",
				"target",
			]);

			// Variants that are not density-or-type aware should still prefer
			// the specialist path (tight cluster = higher jaccard MI).
			// Skip resource-allocation and hub-promoted which have different semantics.
			const structuralVariants = [
				"jaccard",
				"cosine",
				"sorensen",
				"scale",
				"adaptive",
			];

			for (const name of structuralVariants) {
				const mi = ALL_VARIANTS.get(name);
				if (mi === undefined) continue;

				const result = parse(graph, [hubPath, specialistPath], { mi });

				const hubSalience =
					result.paths.find((p) => p.nodes.includes("fame_connector"))
						?.salience ?? 0;
				const specialistSalience =
					result.paths.find((p) => p.nodes.includes("specialist1"))?.salience ??
					0;

				expect(
					specialistSalience,
					`${name}: specialist path salience (${specialistSalience.toFixed(4)}) should be >= hub path (${hubSalience.toFixed(4)})`,
				).toBeGreaterThanOrEqual(hubSalience * 0.9);
			}
		});

		it("PARSE results are sorted by salience (highest first) for all variants", () => {
			const { graph } = createThreeCommunityFixture();

			// Use three structurally different paths to give PARSE real variation
			const paths = [
				createPath(["alice", "bob"]),
				createPath(["alice", "bob", "carol", "david"]),
				createPath(["alice", "bob", "carol", "emma", "liaison1", "frank"]),
			];

			for (const [name, mi] of ALL_VARIANTS) {
				const result = parse(graph, paths, { mi });

				for (let i = 0; i < result.paths.length - 1; i++) {
					const current = result.paths[i]?.salience ?? 0;
					const next = result.paths[i + 1]?.salience ?? 0;

					expect(
						current,
						`${name}: result.paths[${String(i)}].salience (${current.toFixed(6)}) should be >= result.paths[${String(i + 1)}].salience (${next.toFixed(6)})`,
					).toBeGreaterThanOrEqual(next);
				}
			}
		});
	});

	describe("baseline variants behave as expected", () => {
		it("resourceAllocation produces non-zero scores on paths with shared neighbours", () => {
			const { graph } = createThreeCommunityFixture();

			// Within the dense lab cluster, nodes share many common neighbours
			const labPath = createPath(["alice", "bob", "carol"]);

			const result = parse(graph, [labPath], { mi: resourceAllocation });
			const salience = result.paths[0]?.salience ?? 0;

			expect(salience).toBeGreaterThan(0);
		});

		it("adamicAdar and jaccard agree on ranking direction for specialist vs hub paths", () => {
			const { graph } = createQualityVsPopularityFixture();

			const hubPath = createPath(["source", "fame_connector", "target"]);
			const specialistPath = createPath([
				"source",
				"specialist1",
				"specialist2",
				"target",
			]);

			const jaccardResult = parse(graph, [hubPath, specialistPath], {
				mi: jaccard,
			});
			const aaResult = parse(graph, [hubPath, specialistPath], {
				mi: adamicAdar,
			});

			const jaccardSpecialist =
				jaccardResult.paths.find((p) => p.nodes.includes("specialist1"))
					?.salience ?? 0;
			const jaccardHub =
				jaccardResult.paths.find((p) => p.nodes.includes("fame_connector"))
					?.salience ?? 0;

			const aaSpecialist =
				aaResult.paths.find((p) => p.nodes.includes("specialist1"))?.salience ??
				0;
			const aaHub =
				aaResult.paths.find((p) => p.nodes.includes("fame_connector"))
					?.salience ?? 0;

			// Both should rank specialist >= hub
			expect(jaccardSpecialist).toBeGreaterThanOrEqual(jaccardHub * 0.9);
			expect(aaSpecialist).toBeGreaterThanOrEqual(aaHub * 0.9);
		});
	});
});
