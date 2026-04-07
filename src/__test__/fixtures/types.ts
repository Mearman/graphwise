/**
 * Type definitions for test graph fixtures.
 *
 * These types define the structure of test graphs used across
 * integration tests for exploration, ranking, and other algorithms.
 */

import type { NodeData, EdgeData, ReadableGraph } from "../../graph";
import type { Seed } from "../../exploration";

/**
 * Knowledge graph node with optional label and type.
 */
export interface KGNode extends NodeData {
	/** Human-readable label for the node */
	readonly label: string;
	/** Optional semantic type (e.g., 'person', 'organisation') */
	readonly type?: string;
}

/**
 * Knowledge graph edge with optional weight and type.
 */
export interface KGEdge extends EdgeData {
	/** Edge weight (default 1 for unweighted graphs) */
	readonly weight?: number;
	/** Optional semantic edge type (e.g., 'knows', 'mentors', 'cites') */
	readonly type?: string;
}

/**
 * Test graph fixture: graph, seeds, and metadata.
 *
 * Provides a complete test context including the graph,
 * initial seed nodes, and optional metadata about the fixture's properties.
 */
export interface TestGraphFixture {
	/** The test graph */
	readonly graph: ReadableGraph;
	/** Seed nodes for exploration */
	readonly seeds: readonly Seed[];
	/** Optional metadata about the fixture (e.g. structure description) */
	readonly metadata: Record<string, unknown>;
}
