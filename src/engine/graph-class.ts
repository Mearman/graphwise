/**
 * Atomic graph class configuration and constraint logic.
 *
 * Classifies graphs by 8 independent boolean properties.
 * Enforces structural impossibility rules so that only valid
 * combinations can be selected.
 */

export interface GraphClassConfig {
	readonly isDirected: boolean;
	readonly isWeighted: boolean;
	readonly isCyclic: boolean;
	readonly isConnected: boolean;
	readonly isHeterogeneous: boolean;
	readonly isMultigraph: boolean;
	readonly hasSelfLoops: boolean;
	readonly isComplete: boolean;
}

export type GraphClassKey = keyof GraphClassConfig;

/** Default: connected cyclic undirected simple graph (matches previous generator). */
export const DEFAULT_GRAPH_CLASS: GraphClassConfig = {
	isDirected: false,
	isWeighted: false,
	isCyclic: true,
	isConnected: true,
	isHeterogeneous: false,
	isMultigraph: false,
	hasSelfLoops: false,
	isComplete: false,
};

/**
 * Apply structural constraints after toggling a single property.
 *
 * Impossibility rules enforced:
 *   I1: complete && !connected        (complete forces connected)
 *   I2: complete && multigraph        (complete excludes multigraph)
 *   I3: self_loops && !cyclic         (self-loops force cyclic)
 *   C1: !directed && complete && !cyclic  (undirected K_n is cyclic for n >= 3)
 */
export function applyConstraints(
	config: GraphClassConfig,
	changedKey: GraphClassKey,
): GraphClassConfig {
	const result = { ...config };

	switch (changedKey) {
		case "isComplete":
			if (result.isComplete) {
				// I1: complete forces connected
				result.isConnected = true;
				// I2: complete excludes multigraph
				result.isMultigraph = false;
				// C1: undirected complete forces cyclic (for n >= 3, enforced at UI level)
				if (!result.isDirected) {
					result.isCyclic = true;
				}
			}
			break;

		case "hasSelfLoops":
			if (result.hasSelfLoops) {
				// I3: self-loops force cyclic
				result.isCyclic = true;
			}
			break;

		case "isConnected":
			if (!result.isConnected) {
				// I1 contrapositive: disconnected forces non-complete
				result.isComplete = false;
			}
			break;

		case "isCyclic":
			if (!result.isCyclic) {
				// I3 contrapositive: acyclic forces no self-loops
				result.hasSelfLoops = false;
				// C1: undirected complete must be cyclic
				if (!result.isDirected && result.isComplete) {
					result.isComplete = false;
				}
			}
			break;

		case "isMultigraph":
			if (result.isMultigraph) {
				// I2 contrapositive: multigraph forces non-complete
				result.isComplete = false;
			}
			break;

		case "isDirected":
			if (!result.isDirected) {
				// C1: undirected complete acyclic is impossible
				if (result.isComplete && !result.isCyclic) {
					result.isCyclic = true;
				}
			}
			break;

		// isWeighted and isHeterogeneous are orthogonal — no constraints
		case "isWeighted":
		case "isHeterogeneous":
			break;
	}

	return result;
}

/**
 * Determine which toggles are locked in the current configuration.
 *
 * A locked toggle cannot be changed without first changing its
 * constraining toggle. The UI should grey these out.
 */
export function getDisabledToggles(
	config: GraphClassConfig,
	nodeCount: number,
): Record<GraphClassKey, boolean> {
	return {
		isDirected: false,
		isWeighted: false,
		isHeterogeneous: false,

		// I1: if complete, connected is locked on
		isConnected: config.isComplete,

		// I2: if complete, multigraph is locked off
		isMultigraph: config.isComplete,

		// I3: if hasSelfLoops, cyclic is locked on
		// C1: if !directed && complete && nodeCount >= 3, cyclic is locked on
		isCyclic:
			config.hasSelfLoops ||
			(!config.isDirected && config.isComplete && nodeCount >= 3),

		// I3 contrapositive: if !cyclic, self-loops locked off
		hasSelfLoops: !config.isCyclic,

		// I1 + I2: if !connected or multigraph, complete is locked off
		isComplete: !config.isConnected || config.isMultigraph,
	};
}

/** Human-readable labels for each toggle. */
export const GRAPH_CLASS_LABELS: Record<GraphClassKey, string> = {
	isDirected: "Directed",
	isWeighted: "Weighted",
	isCyclic: "Cyclic",
	isConnected: "Connected",
	isHeterogeneous: "Heterogeneous",
	isMultigraph: "Multigraph",
	hasSelfLoops: "Self-loops",
	isComplete: "Complete",
};

/** Tooltip explanations for why a toggle is disabled. */
export function getDisabledReason(
	config: GraphClassConfig,
	key: GraphClassKey,
	nodeCount: number,
): string | undefined {
	switch (key) {
		case "isConnected":
			if (config.isComplete) return "Complete graphs are always connected";
			return undefined;

		case "isMultigraph":
			if (config.isComplete)
				return "Complete graphs have exactly one edge per pair";
			return undefined;

		case "isCyclic":
			if (config.hasSelfLoops) return "Self-loops are cycles of length 1";
			if (!config.isDirected && config.isComplete && nodeCount >= 3)
				return "Undirected complete graphs are always cyclic";
			return undefined;

		case "hasSelfLoops":
			if (!config.isCyclic) return "Self-loops require cyclic graphs";
			return undefined;

		case "isComplete":
			if (!config.isConnected) return "Complete graphs require connectivity";
			if (config.isMultigraph)
				return "Complete graphs cannot have parallel edges";
			return undefined;

		default:
			return undefined;
	}
}

// ---------------------------------------------------------------------------
// Bitmask encoding for URL serialisation
// Bit layout is stable — do not reorder after release.
// ---------------------------------------------------------------------------

// bit 0: isDirected, 1: isWeighted, 2: isCyclic, 3: isConnected,
// 4: isHeterogeneous, 5: isMultigraph, 6: hasSelfLoops, 7: isComplete

/** Encode a GraphClassConfig as a compact integer bitmask for URL storage. */
export function encodeGraphClass(config: GraphClassConfig): number {
	return (
		(config.isDirected ? 1 : 0) |
		(config.isWeighted ? 2 : 0) |
		(config.isCyclic ? 4 : 0) |
		(config.isConnected ? 8 : 0) |
		(config.isHeterogeneous ? 16 : 0) |
		(config.isMultigraph ? 32 : 0) |
		(config.hasSelfLoops ? 64 : 0) |
		(config.isComplete ? 128 : 0)
	);
}

/** Decode a bitmask integer back to a GraphClassConfig. */
export function decodeGraphClass(bits: number): GraphClassConfig {
	return {
		isDirected: Boolean(bits & 1),
		isWeighted: Boolean(bits & 2),
		isCyclic: Boolean(bits & 4),
		isConnected: Boolean(bits & 8),
		isHeterogeneous: Boolean(bits & 16),
		isMultigraph: Boolean(bits & 32),
		hasSelfLoops: Boolean(bits & 64),
		isComplete: Boolean(bits & 128),
	};
}
