import { useColumnStore } from "../state/column-store";
import { useAnimationStore } from "../state/animation-store";
import { useGraphStore } from "../state/graph-store";
import { useGenerationStore } from "../state/generation-store";
import { getAlgorithm } from "./algorithm-registry";
import { runWithFrameCapture } from "./animation-runner";
import { runRanking } from "./ranking-runner";

/**
 * Run all configured columns.
 *
 * For each column with a non-null expansion algorithm:
 * 1. Run expansion with frame capture
 * 2. Store frames via animationStore.loadResult()
 * 3. Run ranking with the column's MI variant and ranking algorithm
 * 4. Store results back in columnStore
 */
export function runAllColumns(): void {
	const graph = useGraphStore.getState().graph;
	const seeds = useGraphStore.getState().seeds;

	if (seeds.length < 2) {
		console.warn("Cannot run: graph not loaded or insufficient seeds");
		return;
	}

	const { maxIterations } = useGenerationStore.getState();
	const expansionConfig =
		maxIterations > 0 ? { maxIterations } : undefined;

	const columns = useColumnStore.getState().columns;
	const setExpansionResult = useColumnStore.getState().setExpansionResult;
	const setRankingResult = useColumnStore.getState().setRankingResult;
	const setRunning = useColumnStore.getState().setRunning;
	const loadResult = useAnimationStore.getState().loadResult;

	// Mark columns as running
	useColumnStore.getState().runAll();

	// Use setTimeout to allow UI to update before heavy computation
	setTimeout(() => {
		for (const column of columns) {
			if (column.expansionAlgorithm === null) {
				continue;
			}

			try {
				// Get algorithm info
				const info = getAlgorithm(column.expansionAlgorithm);
				if (info === undefined) {
					console.warn(`Unknown algorithm: ${column.expansionAlgorithm}`);
					setRunning(column.id, false);
					continue;
				}

				// Run expansion with frame capture
				const animResult = runWithFrameCapture(
					graph,
					seeds,
					info.run,
					expansionConfig,
				);

				// Store animation frames for this algorithm
				loadResult(animResult, column.expansionAlgorithm);

				// Store expansion result
				setExpansionResult(column.id, animResult.result);

				// Run ranking
				if (animResult.result.paths.length > 0) {
					const rankingResult = runRanking(
						graph,
						animResult.result.paths,
						column.miVariant,
						column.rankingAlgorithm,
					);
					setRankingResult(column.id, rankingResult);
				} else {
					setRankingResult(column.id, null);
				}
			} catch (error) {
				console.error(`Column ${column.id} failed:`, error);
				setRunning(column.id, false);
			}
		}
	}, 10);
}
