import type { NodeData, EdgeData, ReadableGraph } from "graphwise/graph";
import type { NodeId } from "graphwise/graph";
import type {
	Seed,
	ExpansionResult,
	ExpansionConfig,
} from "graphwise/expansion";
import type {
	ExpansionAnimationFrame,
	AnimationResult,
	TimelineEvent,
} from "./frame-types";

/**
 * Run expansion with frame capture.
 *
 * Since baseCore is not exported, this creates synthetic frames based on
 * the expansion result. For full per-iteration capture, the expansion
 * algorithm would need to support progress callbacks.
 */
export function runWithFrameCapture<N extends NodeData, E extends EdgeData>(
	graph: ReadableGraph<N, E>,
	seeds: readonly Seed[],
	algorithm: (
		g: ReadableGraph<N, E>,
		s: readonly Seed[],
		c?: ExpansionConfig<N, E>,
	) => ExpansionResult,
	config?: ExpansionConfig<N, E>,
): AnimationResult {
	if (seeds.length === 0) {
		const emptyResult: ExpansionResult = {
			paths: [],
			sampledNodes: new Set<NodeId>(),
			sampledEdges: new Set(),
			visitedPerFrontier: [],
			stats: {
				iterations: 0,
				nodesVisited: 0,
				edgesTraversed: 0,
				pathsFound: 0,
				durationMs: 0,
				algorithm: "unknown",
				termination: "exhausted",
			},
		};
		return { frames: [], events: [], result: emptyResult };
	}

	// Run the algorithm
	const result = algorithm(graph, seeds, config);
	const frames: ExpansionAnimationFrame[] = [];
	const events: TimelineEvent[] = [];

	// Create synthetic frames from the result
	// We'll create one frame per iteration based on stats
	const { stats, paths, sampledNodes, visitedPerFrontier } = result;
	const nodesArray = [...sampledNodes];

	// Distribute visited nodes across iterations
	const nodesPerFrame = Math.ceil(
		nodesArray.length / Math.max(1, stats.iterations),
	);

	for (let i = 0; i < stats.iterations; i++) {
		const startIdx = i * nodesPerFrame;
		const endIdx = Math.min(startIdx + nodesPerFrame, nodesArray.length);
		const frameNodes = nodesArray.slice(0, endIdx);

		const visitedNodes = new Map<NodeId, number>();
		for (const nodeId of frameNodes) {
			// Determine which frontier visited this node
			let frontierIdx = 0;
			for (let f = 0; f < visitedPerFrontier.length; f++) {
				if (visitedPerFrontier[f]?.has(nodeId) === true) {
					frontierIdx = f;
					break;
				}
			}
			visitedNodes.set(nodeId, frontierIdx);
		}

		const frontierSizes = visitedPerFrontier.map((set) => {
			// Estimate frontier size at this iteration
			return Math.min(
				set.size,
				Math.floor((endIdx / nodesArray.length) * set.size),
			);
		});

		const expandedNode =
			nodesArray[Math.min(startIdx, nodesArray.length - 1)] ?? "";

		const frame: ExpansionAnimationFrame = {
			index: i,
			iteration: i,
			activeFrontier: i % Math.max(1, seeds.length),
			expandedNode,
			expandedNeighbours: [],
			visitedNodes,
			frontierQueues: visitedPerFrontier.map(
				(s) => new Set([...s].slice(0, endIdx)),
			),
			frontierSizes,
			discoveredPaths: paths.slice(
				0,
				Math.floor((i / stats.iterations) * paths.length),
			),
			edgesTraversed: Math.floor((i / stats.iterations) * stats.edgesTraversed),
			newPathDiscovered: null,
			phaseTransition: null,
		};

		frames.push(frame);
	}

	// Create events for path discoveries
	for (let i = 0; i < paths.length; i++) {
		const frameIdx = Math.floor(
			((i + 1) / paths.length) * Math.max(1, frames.length - 1),
		);
		events.push({
			frameIndex: frameIdx,
			type: "path-discovered",
			label: `Path ${String(i + 1)} found`,
		});
	}

	// Add termination event
	if (frames.length > 0) {
		events.push({
			frameIndex: frames.length - 1,
			type: "termination",
			label: "Expansion complete",
		});
	}

	return { frames, events, result };
}
