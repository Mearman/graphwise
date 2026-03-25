import type { NodeId } from "graphwise/graph";
import type { ExpansionPath } from "graphwise/expansion";

/** A snapshot of expansion state at one iteration. */
export interface ExpansionAnimationFrame {
	readonly index: number;
	readonly iteration: number;
	readonly activeFrontier: number;
	readonly expandedNode: NodeId;
	readonly expandedNeighbours: readonly NodeId[];
	readonly visitedNodes: ReadonlyMap<NodeId, number>;
	readonly frontierQueues: readonly ReadonlySet<NodeId>[];
	readonly frontierSizes: readonly number[];
	readonly discoveredPaths: readonly ExpansionPath[];
	readonly edgesTraversed: number;
	readonly newPathDiscovered: ExpansionPath | null;
	readonly phaseTransition: string | null;
}

/** Types of timeline events displayed as markers. */
export type TimelineEventType =
	| "path-discovered"
	| "phase-transition"
	| "termination";

/** A timeline event for the scrubable timeline. */
export interface TimelineEvent {
	readonly frameIndex: number;
	readonly type: TimelineEventType;
	readonly label: string;
}

/** Complete result from animation runner. */
export interface AnimationResult {
	readonly frames: readonly ExpansionAnimationFrame[];
	readonly events: readonly TimelineEvent[];
	readonly result: import("graphwise/expansion").ExpansionResult;
}
