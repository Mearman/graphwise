import { type ReactNode } from "react";
import {
	Stack,
	Text,
	Badge,
	Paper,
	Group,
	Alert,
	Divider,
	Collapse,
	ActionIcon,
	Box,
} from "@mantine/core";
import {
	IconChevronDown,
	IconChevronUp,
	IconBulb,
	IconRoute,
	IconGraph,
} from "@tabler/icons-react";
import { useState } from "react";
import { useAnimationStore } from "../../state/animation-store";
import { useGraphStore } from "../../state/graph-store";
import { useComparisonStore } from "../../state/comparison-store";
import {
	getAlgorithm,
	type ExpansionAlgorithmName,
} from "../../engine/algorithm-registry";
import { FrontierGauge } from "./FrontierGauge";
import { PathTimeline } from "./PathTimeline";
import { ComparisonTable } from "../comparison/ComparisonTable";

export type FrameInspectorProps = Record<string, never>;

export function FrameInspector(_props: FrameInspectorProps): ReactNode {
	const [showComparison, setShowComparison] = useState(false);

	const frames = useAnimationStore((state) => state.frames);
	const events = useAnimationStore((state) => state.events);
	const currentFrameIndex = useAnimationStore(
		(state) => state.currentFrameIndex,
	);
	const algorithmName = useAnimationStore((state) => state.algorithmName);
	const setFrame = useAnimationStore((state) => state.setFrame);

	const graph = useGraphStore((state) => state.graph);

	const entries = useComparisonStore((state) => state.entries);
	const miEntries = useComparisonStore((state) => state.miEntries);
	const comparisonStage = useComparisonStore((state) => state.comparisonStage);
	const totalDurationMs = useComparisonStore((state) => state.totalDurationMs);

	const currentFrame = frames[currentFrameIndex] ?? null;
	const algorithmInfo =
		algorithmName && isExpansionAlgorithmName(algorithmName)
			? getAlgorithm(algorithmName)
			: null;

	if (frames.length === 0) {
		return (
			<Paper p="md" withBorder>
				<Text size="sm" c="dimmed" ta="center">
					Run an expansion to see frame details
				</Text>
			</Paper>
		);
	}

	if (currentFrame === null) {
		return null;
	}

	const expandedNodeDegree = graph.degree(currentFrame.expandedNode);
	const activeFrontier: 0 | 1 = currentFrame.activeFrontier === 1 ? 1 : 0;
	const sourceSize = currentFrame.frontierSizes[0] ?? 0;
	const targetSize = currentFrame.frontierSizes[1] ?? 0;

	return (
		<Stack gap="md">
			{/* Header */}
			<Paper p="sm" withBorder>
				<Group justify="space-between" wrap="nowrap">
					<Group gap="xs">
						{algorithmInfo ? (
							<>
								<Text size="sm" fw={500}>
									{algorithmInfo.label}
								</Text>
								{algorithmInfo.category === "novel" ? (
									<Badge size="xs" variant="light" color="blue">
										Novel
									</Badge>
								) : null}
							</>
						) : (
							<Text size="sm" fw={500}>
								{algorithmName}
							</Text>
						)}
					</Group>
					<Text size="sm" ff="monospace">
						Frame {currentFrameIndex + 1}/{frames.length}
					</Text>
				</Group>
			</Paper>

			{/* Expanded Node Section */}
			<Paper p="sm" withBorder>
				<Stack gap="xs">
					<Group justify="space-between">
						<Text size="xs" fw={500}>
							Expanded Node
						</Text>
						<Text size="xs" c="dimmed">
							Iteration {currentFrame.iteration}
						</Text>
					</Group>
					<Group gap="xs">
						<Badge size="lg" variant="filled" color="green">
							{currentFrame.expandedNode}
						</Badge>
						<Text size="xs" c="dimmed">
							degree: {expandedNodeDegree}
						</Text>
					</Group>
					{currentFrame.expandedNeighbours.length > 0 ? (
						<Stack gap={4}>
							<Text size="xs" c="dimmed">
								Discovered {currentFrame.expandedNeighbours.length} neighbours:
							</Text>
							<Group gap={4}>
								{currentFrame.expandedNeighbours.slice(0, 5).map((nodeId) => (
									<Badge key={nodeId} size="xs" variant="light">
										{nodeId}
									</Badge>
								))}
								{currentFrame.expandedNeighbours.length > 5 ? (
									<Text size="xs" c="dimmed">
										+{currentFrame.expandedNeighbours.length - 5} more
									</Text>
								) : null}
							</Group>
						</Stack>
					) : null}
				</Stack>
			</Paper>

			{/* Frontier Section */}
			<Paper p="sm" withBorder>
				<FrontierGauge
					sourceSize={sourceSize}
					targetSize={targetSize}
					activeFrontier={activeFrontier}
				/>
				<Divider my="xs" />
				<Group justify="space-between">
					<Text size="xs" c="dimmed">
						Visited nodes
					</Text>
					<Text size="xs" ff="monospace">
						{currentFrame.visitedNodes.size}
					</Text>
				</Group>
			</Paper>

			{/* Paths Section */}
			<Paper p="sm" withBorder>
				<Stack gap="xs">
					<Group justify="space-between">
						<Group gap="xs">
							<IconRoute size={14} />
							<Text size="xs" fw={500}>
								Paths
							</Text>
						</Group>
						<Text size="xs" ff="monospace">
							{currentFrame.discoveredPaths.length}
						</Text>
					</Group>
					{currentFrame.newPathDiscovered !== null ? (
						<Alert
							icon={<IconBulb size={14} />}
							color="yellow"
							variant="light"
							p="xs"
						>
							<Text size="xs">New path discovered!</Text>
							<Text size="xs" ff="monospace">
								{currentFrame.newPathDiscovered.nodes.length} nodes
							</Text>
						</Alert>
					) : null}
				</Stack>
			</Paper>

			{/* Phase Transition Section */}
			{currentFrame.phaseTransition !== null ? (
				<Alert
					icon={<IconGraph size={14} />}
					color="orange"
					variant="light"
					p="xs"
				>
					<Text size="xs" fw={500}>
						Phase Transition
					</Text>
					<Text size="xs">{currentFrame.phaseTransition}</Text>
				</Alert>
			) : null}

			{/* Cumulative Stats */}
			<Paper p="sm" withBorder>
				<Stack gap={4}>
					<Text size="xs" fw={500}>
						Cumulative
					</Text>
					<Group justify="space-between">
						<Text size="xs" c="dimmed">
							Edges traversed
						</Text>
						<Text size="xs" ff="monospace">
							{currentFrame.edgesTraversed}
						</Text>
					</Group>
					<Group justify="space-between">
						<Text size="xs" c="dimmed">
							Iteration
						</Text>
						<Text size="xs" ff="monospace">
							{currentFrame.iteration}
						</Text>
					</Group>
				</Stack>
			</Paper>

			{/* Path Timeline */}
			<Paper p="sm" withBorder>
				<PathTimeline
					events={events}
					totalFrames={frames.length}
					currentFrameIndex={currentFrameIndex}
					onSeek={setFrame}
				/>
			</Paper>

			{/* Comparison Table Toggle */}
			<Paper p="sm" withBorder>
				<Group
					justify="space-between"
					style={{ cursor: "pointer" }}
					onClick={() => {
						setShowComparison(!showComparison);
					}}
				>
					<Text size="xs" fw={500}>
						Comparison Results
					</Text>
					<ActionIcon size="xs" variant="subtle">
						{showComparison ? (
							<IconChevronUp size={14} />
						) : (
							<IconChevronDown size={14} />
						)}
					</ActionIcon>
				</Group>
				<Collapse in={showComparison}>
					<Box mt="xs">
						{entries.length > 0 ? (
							<ComparisonTable
								entries={entries}
								miEntries={miEntries}
								comparisonStage={comparisonStage}
								totalDurationMs={totalDurationMs}
							/>
						) : comparisonStage === "mi" && miEntries.length > 0 ? (
							<ComparisonTable
								entries={entries}
								miEntries={miEntries}
								comparisonStage={comparisonStage}
								totalDurationMs={totalDurationMs}
							/>
						) : (
							<Text size="xs" c="dimmed">
								Run a comparison to see results
							</Text>
						)}
					</Box>
				</Collapse>
			</Paper>
		</Stack>
	);
}

function isExpansionAlgorithmName(
	value: string,
): value is ExpansionAlgorithmName {
	const validNames: readonly string[] = [
		"base",
		"dome",
		"edge",
		"hae",
		"pipe",
		"sage",
		"reach",
		"maze",
		"tide",
		"lace",
		"warp",
		"fuse",
		"sift",
		"flux",
		"standard-bfs",
		"frontier-balanced",
		"random-priority",
		"dfs-priority",
	];
	return validNames.includes(value);
}
