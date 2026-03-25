import { type ReactNode, useCallback } from "react";
import { Stack, Group, Button, Text, Divider, Paper } from "@mantine/core";
import { AlgorithmSelector } from "./AlgorithmSelector";
import { ComparisonTable } from "./ComparisonTable";
import {
	useComparisonStore,
	type ComparisonEntry,
} from "../../state/comparison-store";
import { useGraphStore } from "../../state/graph-store";
import { useAnimationStore } from "../../state/animation-store";
import { runComparison } from "../../engine/comparison-runner";
import { runWithFrameCapture } from "../../engine/animation-runner";
import {
	getAlgorithm,
	type ExpansionAlgorithmName,
} from "../../engine/algorithm-registry";

export type ComparisonPanelProps = Record<string, never>;

export function ComparisonPanel(_props: ComparisonPanelProps): ReactNode {
	const selectedAlgorithms = useComparisonStore(
		(state) => state.selectedAlgorithms,
	);
	const entries = useComparisonStore((state) => state.entries);
	const totalDurationMs = useComparisonStore((state) => state.totalDurationMs);
	const isRunning = useComparisonStore((state) => state.isRunning);
	const setRunning = useComparisonStore((state) => state.setRunning);
	const loadResults = useComparisonStore((state) => state.loadResults);
	const reset = useComparisonStore((state) => state.reset);
	const clearSelection = useComparisonStore((state) => state.clearSelection);

	const graph = useGraphStore((state) => state.graph);
	const seeds = useGraphStore((state) => state.seeds);

	const animationLoadResult = useAnimationStore((state) => state.loadResult);

	const handleRunComparison = useCallback(() => {
		if (selectedAlgorithms.length === 0) return;

		setRunning(true);

		// Use setTimeout to allow UI to update before blocking work
		setTimeout(() => {
			try {
				const result = runComparison(graph, seeds, selectedAlgorithms);

				// Convert ComparisonRunner.Entry to store ComparisonEntry format
				const storeEntries: ComparisonEntry[] = result.entries.map((e) => ({
					algorithmName: e.algorithmName,
					stats: e.stats,
				}));

				loadResults(storeEntries, result.totalDurationMs);

				// Generate animation frames for the first algorithm
				const firstAlgo = storeEntries.at(0);
				if (firstAlgo !== undefined) {
					const info = getAlgorithm(firstAlgo.algorithmName);
					if (info !== undefined) {
						const animResult = runWithFrameCapture(graph, seeds, info.run);
						animationLoadResult(animResult, firstAlgo.algorithmName);
					}
				}
			} catch (error) {
				console.error("Comparison failed:", error);
				setRunning(false);
			}
		}, 10);
	}, [
		selectedAlgorithms,
		graph,
		seeds,
		setRunning,
		loadResults,
		animationLoadResult,
	]);

	const handleReset = useCallback(() => {
		reset();
		clearSelection();
	}, [reset, clearSelection]);

	const handleReplay = useCallback(
		(algorithmName: ExpansionAlgorithmName) => {
			const info = getAlgorithm(algorithmName);
			if (info === undefined) return;

			const animResult = runWithFrameCapture(graph, seeds, info.run);
			animationLoadResult(animResult, algorithmName);
		},
		[graph, seeds, animationLoadResult],
	);

	const canRun = selectedAlgorithms.length > 0 && !isRunning;

	return (
		<Paper p="md" withBorder>
			<Stack gap="md">
				<Group justify="space-between">
					<Text size="lg" fw={500}>
						Algorithm Comparison
					</Text>
					<Group gap="xs">
						<Button
							size="xs"
							variant="light"
							onClick={handleReset}
							disabled={isRunning}
						>
							Reset
						</Button>
						<Button
							size="xs"
							onClick={handleRunComparison}
							disabled={!canRun}
							loading={isRunning}
						>
							Run Comparison
						</Button>
					</Group>
				</Group>

				<Divider />

				<AlgorithmSelector />

				{entries.length > 0 ? (
					<>
						<Divider />
						<ComparisonTable
							entries={entries}
							totalDurationMs={totalDurationMs}
							onReplay={handleReplay}
						/>
					</>
				) : null}
			</Stack>
		</Paper>
	);
}
