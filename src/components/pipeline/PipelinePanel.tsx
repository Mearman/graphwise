import { type ReactNode, useCallback } from "react";
import {
	Accordion,
	Stack,
	Text,
	Badge,
	Group,
	Button,
	Paper,
	Select,
} from "@mantine/core";
import {
	IconTarget,
	IconRoute,
	IconTrophy,
	IconChevronRight,
} from "@tabler/icons-react";
import { SeedPicker } from "../graph/SeedPicker";
import { AlgorithmSelector } from "../comparison/AlgorithmSelector";
import { MIVariantSelector } from "./MIVariantSelector";
import { PathCard } from "../ranking/PathCard";
import {
	usePipelineStore,
	type PipelineStage,
} from "../../state/pipeline-store";
import { useGraphStore } from "../../state/graph-store";
import { useComparisonStore } from "../../state/comparison-store";
import { useAnimationStore } from "../../state/animation-store";
import { runComparison } from "../../engine/comparison-runner";
import { runMIVariantComparison } from "../../engine/comparison-runner";
import { runRankingComparison } from "../../engine/comparison-runner";
import { runSeedSelectionComparison } from "../../engine/comparison-runner";
import { runSubgraphExtractionComparison } from "../../engine/comparison-runner";
import { runWithFrameCapture } from "../../engine/animation-runner";
import { runRanking } from "../../engine/ranking-runner";
import {
	getAlgorithm,
	getRankingAlgorithm,
	getSeedSelectionStrategy,
	getSubgraphExtractionStrategy,
	rankingAlgorithmNames,
	seedSelectionStrategyNames,
	subgraphExtractionStrategyNames,
} from "../../engine/algorithm-registry";
import {
	loadFixture,
	fixtureNames,
	type FixtureName,
} from "../../engine/fixture-loader";

function isFixtureName(value: unknown): value is FixtureName {
	return (
		value === "linear-chain" ||
		value === "social-hub" ||
		value === "two-department" ||
		value === "city-village" ||
		value === "city-suburban-village" ||
		value === "three-community" ||
		value === "typed-entity" ||
		value === "quality-vs-popularity"
	);
}

type StageStatus = "pending" | "configured" | "complete";

function getStageStatus(stage: PipelineStage): StageStatus {
	const seeds = useGraphStore.getState().seeds;
	const expansionResult = usePipelineStore.getState().expansionResult;
	const rankingResult = usePipelineStore.getState().rankingResult;

	switch (stage) {
		case 1:
			return seeds.length >= 2 ? "complete" : "pending";
		case 2:
			return expansionResult !== null
				? "complete"
				: seeds.length >= 2
					? "configured"
					: "pending";
		case 3:
			return rankingResult !== null
				? "complete"
				: expansionResult !== null
					? "configured"
					: "pending";
	}
}

function StageBadge({ status }: { readonly status: StageStatus }): ReactNode {
	const colour =
		status === "complete" ? "green" : status === "configured" ? "blue" : "gray";
	return (
		<Badge size="xs" variant="light" color={colour}>
			{status}
		</Badge>
	);
}

export type PipelinePanelProps = Record<string, never>;

export function PipelinePanel(_props: PipelinePanelProps): ReactNode {
	const activeStage = usePipelineStore((state) => state.activeStage);
	const setActiveStage = usePipelineStore((state) => state.setActiveStage);
	const primaryAlgorithm = usePipelineStore((state) => state.primaryAlgorithm);
	const comparisonAlgorithms = usePipelineStore(
		(state) => state.comparisonAlgorithms,
	);
	const expansionResult = usePipelineStore((state) => state.expansionResult);
	const rankingResult = usePipelineStore((state) => state.rankingResult);
	const setExpansionResult = usePipelineStore(
		(state) => state.setExpansionResult,
	);
	const setRankingResult = usePipelineStore((state) => state.setRankingResult);
	const setExpansionRunning = usePipelineStore(
		(state) => state.setExpansionRunning,
	);
	const setRankingRunning = usePipelineStore(
		(state) => state.setRankingRunning,
	);
	const selectedMIVariant = usePipelineStore(
		(state) => state.selectedMIVariant,
	);

	const graph = useGraphStore((state) => state.graph);
	const seeds = useGraphStore((state) => state.seeds);
	const setGraph = useGraphStore((state) => state.setGraph);
	const setSeeds = useGraphStore((state) => state.setSeeds);

	const animationLoadResult = useAnimationStore((state) => state.loadResult);
	const loadResults = useComparisonStore((state) => state.loadResults);
	const loadMIResults = useComparisonStore((state) => state.loadMIResults);
	const loadRankingResults = useComparisonStore(
		(state) => state.loadRankingResults,
	);
	const loadSubgraphResults = useComparisonStore(
		(state) => state.loadSubgraphResults,
	);
	const selectedMIVariants = useComparisonStore(
		(state) => state.selectedMIVariants,
	);
	const selectedRankingAlgorithms = useComparisonStore(
		(state) => state.selectedRankingAlgorithms,
	);
	const setSelectedRankingAlgorithms = useComparisonStore(
		(state) => state.setSelectedRankingAlgorithms,
	);
	const selectedSeedStrategies = useComparisonStore(
		(state) => state.selectedSeedStrategies,
	);
	const selectedSubgraphStrategies = useComparisonStore(
		(state) => state.selectedSubgraphStrategies,
	);
	const toggleSeedStrategy = useComparisonStore(
		(state) => state.toggleSeedStrategy,
	);
	const toggleSubgraphStrategy = useComparisonStore(
		(state) => state.toggleSubgraphStrategy,
	);
	const loadSeedResults = useComparisonStore((state) => state.loadSeedResults);
	const comparisonIsRunning = useComparisonStore((state) => state.isRunning);
	const setComparisonRunning = useComparisonStore((state) => state.setRunning);

	const stage1Status = getStageStatus(1);
	const stage2Status = getStageStatus(2);
	const stage3Status = getStageStatus(3);

	const fixtureOptions = fixtureNames().map((name) => ({
		value: name,
		label: name,
	}));

	const handleLoadFixture = useCallback(
		(value: string | null) => {
			if (value === null) return;
			if (!isFixtureName(value)) return;
			const fixture = loadFixture(value);
			setGraph(fixture.graph, fixture.graph.directed);
			setSeeds(fixture.seeds);
		},
		[setGraph, setSeeds],
	);

	const handleRunExpansion = useCallback(() => {
		if (primaryAlgorithm === null) return;
		if (comparisonAlgorithms.length === 0) return;

		setExpansionRunning(true);
		setComparisonRunning(true);

		setTimeout(() => {
			try {
				const algorithmsToRun = [
					primaryAlgorithm,
					...comparisonAlgorithms.filter((a) => a !== primaryAlgorithm),
				];
				const result = runComparison(graph, seeds, algorithmsToRun);

				loadResults(
					result.entries.map((e) => ({
						algorithmName: e.algorithmName,
						stats: e.stats,
						result: e.result,
					})),
					result.totalDurationMs,
				);

				// Set the primary algorithm's result for ranking
				const primaryEntry = result.entries.find(
					(e) => e.algorithmName === primaryAlgorithm,
				);
				if (primaryEntry !== undefined) {
					setExpansionResult(primaryEntry.result);
				}

				// Generate animation frames for primary algorithm
				const info = getAlgorithm(primaryAlgorithm);
				if (info !== undefined) {
					const animResult = runWithFrameCapture(graph, seeds, info.run);
					animationLoadResult(animResult, primaryAlgorithm);
				}
				setExpansionRunning(false);
			} catch (error) {
				console.error("Expansion failed:", error);
				setExpansionRunning(false);
				setComparisonRunning(false);
			}
		}, 10);
	}, [
		primaryAlgorithm,
		comparisonAlgorithms,
		graph,
		seeds,
		setExpansionRunning,
		setComparisonRunning,
		loadResults,
		setExpansionResult,
		animationLoadResult,
	]);

	const handleRunSeedStrategyComparison = useCallback(() => {
		if (primaryAlgorithm === null) return;
		if (selectedSeedStrategies.length === 0) return;

		setComparisonRunning(true);
		setTimeout(() => {
			try {
				const result = runSeedSelectionComparison(
					graph,
					seeds,
					selectedSeedStrategies,
					primaryAlgorithm,
				);
				loadSeedResults(result.entries, result.totalDurationMs);
			} catch (error) {
				console.error("Seed strategy comparison failed:", error);
				setComparisonRunning(false);
			}
		}, 10);
	}, [
		primaryAlgorithm,
		selectedSeedStrategies,
		graph,
		seeds,
		loadSeedResults,
		setComparisonRunning,
	]);

	const handleRunRanking = useCallback(() => {
		if (expansionResult === null) return;

		setRankingRunning(true);

		setTimeout(() => {
			try {
				const result = runRanking(
					graph,
					expansionResult.paths,
					selectedMIVariant,
				);
				setRankingResult(result);
			} catch (error) {
				console.error("Ranking failed:", error);
				setRankingRunning(false);
			}
		}, 10);
	}, [
		expansionResult,
		graph,
		selectedMIVariant,
		setRankingRunning,
		setRankingResult,
	]);

	const canRunExpansion =
		primaryAlgorithm !== null && seeds.length >= 2 && !comparisonIsRunning;
	const canRunSeedComparison =
		primaryAlgorithm !== null &&
		seeds.length >= 2 &&
		selectedSeedStrategies.length > 0 &&
		!comparisonIsRunning;

	const canRunRanking =
		expansionResult !== null &&
		expansionResult.paths.length > 0 &&
		!comparisonIsRunning;

	const handleRunMIComparison = useCallback(() => {
		if (expansionResult === null) return;
		if (selectedMIVariants.length === 0) return;

		setComparisonRunning(true);
		setTimeout(() => {
			try {
				const result = runMIVariantComparison(
					graph,
					expansionResult.paths,
					selectedMIVariants,
				);
				loadMIResults(result.entries, result.totalDurationMs);
			} catch (error) {
				console.error("MI comparison failed:", error);
				setComparisonRunning(false);
			}
		}, 10);
	}, [
		expansionResult,
		selectedMIVariants,
		graph,
		loadMIResults,
		setComparisonRunning,
	]);

	const handleRunRankingComparison = useCallback(() => {
		if (expansionResult === null) return;
		if (selectedRankingAlgorithms.length === 0) return;

		setComparisonRunning(true);
		setTimeout(() => {
			try {
				const result = runRankingComparison(
					graph,
					expansionResult.paths,
					selectedMIVariant,
					selectedRankingAlgorithms,
				);
				loadRankingResults(result.entries, result.totalDurationMs);
			} catch (error) {
				console.error("Ranking comparison failed:", error);
				setComparisonRunning(false);
			}
		}, 10);
	}, [
		expansionResult,
		selectedRankingAlgorithms,
		selectedMIVariant,
		graph,
		loadRankingResults,
		setComparisonRunning,
	]);

	const handleRunSubgraphComparison = useCallback(() => {
		if (expansionResult === null) return;
		if (selectedSubgraphStrategies.length === 0) return;

		setComparisonRunning(true);
		setTimeout(() => {
			try {
				const result = runSubgraphExtractionComparison(
					graph,
					expansionResult.paths,
					selectedSubgraphStrategies,
					selectedMIVariant,
				);
				loadSubgraphResults(result.entries, result.totalDurationMs);
			} catch (error) {
				console.error("Subgraph extraction comparison failed:", error);
				setComparisonRunning(false);
			}
		}, 10);
	}, [
		expansionResult,
		selectedSubgraphStrategies,
		selectedMIVariant,
		graph,
		loadSubgraphResults,
		setComparisonRunning,
	]);

	const canRunMIComparison =
		expansionResult !== null &&
		expansionResult.paths.length > 0 &&
		selectedMIVariants.length > 0 &&
		!comparisonIsRunning;

	const canRunRankingComparison =
		expansionResult !== null &&
		expansionResult.paths.length > 0 &&
		selectedRankingAlgorithms.length > 0 &&
		!comparisonIsRunning;

	const canRunSubgraphComparison =
		expansionResult !== null &&
		expansionResult.paths.length > 0 &&
		selectedSubgraphStrategies.length > 0 &&
		!comparisonIsRunning;

	const rankingAlgorithmOptions = rankingAlgorithmNames().map((name) => ({
		value: name,
		label: getRankingAlgorithm(name)?.label ?? name,
	}));
	const subgraphStrategyOptions = subgraphExtractionStrategyNames().map(
		(name) => ({
			value: name,
			label: getSubgraphExtractionStrategy(name)?.label ?? name,
		}),
	);

	return (
		<Accordion
			value={String(activeStage)}
			onChange={(value) => {
				if (value !== null) {
					const stageNum = Number(value);
					if (stageNum === 1 || stageNum === 2 || stageNum === 3) {
						setActiveStage(stageNum);
					}
				}
			}}
			chevronPosition="right"
			variant="separated"
		>
			<Accordion.Item value="1">
				<Accordion.Control
					icon={<IconTarget size={16} />}
					chevron={<IconChevronRight size={16} />}
				>
					<Group justify="space-between" wrap="nowrap">
						<Text size="sm" fw={500}>
							Stage 1: Seeds
						</Text>
						<StageBadge status={stage1Status} />
					</Group>
				</Accordion.Control>
				<Accordion.Panel>
					<Stack gap="md">
						<Paper p="sm" withBorder>
							<Text size="xs" fw={500} mb="xs">
								Load Fixture
							</Text>
							<Select
								size="xs"
								placeholder="Select a graph..."
								data={fixtureOptions}
								onChange={handleLoadFixture}
							/>
						</Paper>

						<SeedPicker />

						<Paper p="sm" withBorder>
							<Stack gap="xs">
								<Text size="xs" fw={500}>
									Seed Strategy Comparison
								</Text>
								<Text size="xs" c="dimmed">
									Run downstream expansion for each selected seed strategy using
									the primary algorithm.
								</Text>
								{seedSelectionStrategyNames().map((strategyName) => {
									const info = getSeedSelectionStrategy(strategyName);
									const checked = selectedSeedStrategies.includes(strategyName);
									return (
										<Button
											key={strategyName}
											size="xs"
											variant={checked ? "filled" : "light"}
											color={checked ? "blue" : "gray"}
											justify="space-between"
											onClick={() => {
												toggleSeedStrategy(strategyName);
											}}
											fullWidth
										>
											<Text size="xs" fw={500}>
												{info?.label ?? strategyName}
											</Text>
										</Button>
									);
								})}
								<Button
									size="xs"
									variant="light"
									onClick={handleRunSeedStrategyComparison}
									disabled={!canRunSeedComparison}
									loading={comparisonIsRunning}
									fullWidth
								>
									Compare Seed Strategies
								</Button>
							</Stack>
						</Paper>

						<Text size="xs" c="dimmed">
							Select at least 2 seed nodes for bidirectional expansion
						</Text>
					</Stack>
				</Accordion.Panel>
			</Accordion.Item>

			<Accordion.Item value="2">
				<Accordion.Control
					icon={<IconRoute size={16} />}
					chevron={<IconChevronRight size={16} />}
				>
					<Group justify="space-between" wrap="nowrap">
						<Text size="sm" fw={500}>
							Stage 2: Expansion
						</Text>
						<StageBadge status={stage2Status} />
					</Group>
				</Accordion.Control>
				<Accordion.Panel>
					<Stack gap="md">
						<AlgorithmSelector />

						<Button
							size="xs"
							onClick={handleRunExpansion}
							disabled={!canRunExpansion}
							loading={comparisonIsRunning}
							fullWidth
						>
							Run Expansion
						</Button>

						{expansionResult !== null ? (
							<Text size="xs" c="dimmed">
								Found {expansionResult.paths.length} paths in{" "}
								{expansionResult.stats.iterations} iterations
							</Text>
						) : null}
					</Stack>
				</Accordion.Panel>
			</Accordion.Item>

			<Accordion.Item value="3">
				<Accordion.Control
					icon={<IconTrophy size={16} />}
					chevron={<IconChevronRight size={16} />}
				>
					<Group justify="space-between" wrap="nowrap">
						<Text size="sm" fw={500}>
							Stage 3: Ranking
						</Text>
						<StageBadge status={stage3Status} />
					</Group>
				</Accordion.Control>
				<Accordion.Panel>
					<Stack gap="md">
						<MIVariantSelector />

						<Button
							size="xs"
							onClick={handleRunRanking}
							disabled={!canRunRanking}
							fullWidth
						>
							Rank Paths
						</Button>

						<Button
							size="xs"
							variant="light"
							onClick={handleRunMIComparison}
							disabled={!canRunMIComparison}
							loading={comparisonIsRunning}
							fullWidth
						>
							Compare MI Variants
						</Button>

						<Paper p="sm" withBorder>
							<Stack gap="xs">
								<Text size="xs" fw={500}>
									Ranking Algorithm Comparison
								</Text>
								<Text size="xs" c="dimmed">
									Run multiple ranking algorithms against the same candidate
									paths from expansion.
								</Text>
								<Group gap={6} wrap="wrap">
									{rankingAlgorithmOptions.map((option) => {
										const isSelected = selectedRankingAlgorithms.includes(
											option.value,
										);
										return (
											<Button
												key={option.value}
												size="xs"
												variant={isSelected ? "filled" : "light"}
												color={isSelected ? "violet" : "gray"}
												onClick={() => {
													if (isSelected) {
														setSelectedRankingAlgorithms(
															selectedRankingAlgorithms.filter(
																(name) => name !== option.value,
															),
														);
													} else {
														setSelectedRankingAlgorithms([
															...selectedRankingAlgorithms,
															option.value,
														]);
													}
												}}
											>
												{option.label}
											</Button>
										);
									})}
								</Group>
								<Button
									size="xs"
									variant="light"
									onClick={handleRunRankingComparison}
									disabled={!canRunRankingComparison}
									loading={comparisonIsRunning}
									fullWidth
								>
									Compare Ranking Algorithms
								</Button>
							</Stack>
						</Paper>

						<Paper p="sm" withBorder>
							<Stack gap="xs">
								<Text size="xs" fw={500}>
									Subgraph Extraction Comparison
								</Text>
								<Text size="xs" c="dimmed">
									Compare extraction retention and downstream ranking metrics
									across deterministic subgraph strategies.
								</Text>
								<Group gap={6} wrap="wrap">
									{subgraphStrategyOptions.map((option) => {
										const isSelected = selectedSubgraphStrategies.includes(
											option.value,
										);
										return (
											<Button
												key={option.value}
												size="xs"
												variant={isSelected ? "filled" : "light"}
												color={isSelected ? "teal" : "gray"}
												onClick={() => {
													toggleSubgraphStrategy(option.value);
												}}
											>
												{option.label}
											</Button>
										);
									})}
								</Group>
								<Button
									size="xs"
									variant="light"
									onClick={handleRunSubgraphComparison}
									disabled={!canRunSubgraphComparison}
									loading={comparisonIsRunning}
									fullWidth
								>
									Compare Subgraph Strategies
								</Button>
							</Stack>
						</Paper>

						{rankingResult !== null ? (
							<Stack gap="xs">
								<Text size="xs" c="dimmed">
									{rankingResult.paths.length} paths ranked • Mean salience:{" "}
									{rankingResult.stats.meanSalience.toFixed(3)}
								</Text>
								{rankingResult.paths.slice(0, 5).map((path, idx) => (
									<PathCard key={idx} path={path} rank={idx + 1} />
								))}
								{rankingResult.paths.length > 5 ? (
									<Text size="xs" c="dimmed">
										+{rankingResult.paths.length - 5} more paths
									</Text>
								) : null}
							</Stack>
						) : expansionResult !== null ? (
							<Text size="xs" c="dimmed">
								{expansionResult.paths.length} paths ready for ranking
							</Text>
						) : null}
					</Stack>
				</Accordion.Panel>
			</Accordion.Item>
		</Accordion>
	);
}
