/**
 * Expansion algorithms module.
 *
 * Provides bidirectional expansion algorithms for discovering paths
 * between seed nodes in a graph.
 *
 * @module expansion
 */

// Core types
export type {
	Seed,
	SeedRole,
	ExpansionResult,
	ExpansionPath,
	ExpansionStats,
	ExpansionConfig,
	PriorityFunction,
	PriorityContext,
} from "./types";

// BASE engine
export { base } from "./base";

// DOME (Degree-Ordered Multi-Expansion)
export { dome } from "./dome";

// EDGE (Edge-Degree Guided Expansion)
export { edge } from "./edge";

// HAE (High-Association Expansion)
export { hae } from "./hae";
export type { HAEConfig } from "./hae";

// PIPE (Path Importance Priority Expansion)
export { pipe } from "./pipe";

// SAGE (Salience-Aware Graph Expansion)
export { sage } from "./sage";
export type { SAGEConfig } from "./sage";

// REACH (Rank-Enhanced Adaptive Collision Hash)
export { reach } from "./reach";
export type { REACHConfig } from "./reach";

// MAZE (Multi-Algorithm Zone Exploration)
export { maze } from "./maze";
export type { MAZEConfig } from "./maze";
