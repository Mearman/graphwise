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
import { runWithFrameCapture } from "../../engine/animation-runner";
import { runRanking } from "../../engine/ranking-runner";
import { getAlgorithm } from "../../engine/algorithm-registry";
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

	const canRunRanking =
		expansionResult !== null &&
		expansionResult.paths.length > 0 &&
		!comparisonIsRunning;

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
