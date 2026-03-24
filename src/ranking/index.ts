/**
 * Path ranking module.
 *
 * Provides PARSE (Path-Aware Ranking via Salience Estimation) and
 * baseline ranking methods for comparing discovered paths.
 *
 * @module ranking
 */

// PARSE ranking
export { parse } from "./parse";
export type { PARSEConfig, PARSEResult, RankedPath } from "./parse";

// MI variants
export type {
	MIFunction,
	MIVariantName,
	MIConfig,
	AdaptiveMIConfig,
} from "./mi/types";

export {
	jaccard,
	adamicAdar,
	scale,
	skew,
	span,
	etch,
	notch,
	adaptive,
} from "./mi/index";

// Baseline rankings
export { shortest } from "./baselines/shortest";
export type {
	BaselineConfig,
	BaselineResult,
	ScoredPath,
	PathRanker,
} from "./baselines/types";
