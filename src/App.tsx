import { type ReactNode, useState } from "react";
import {
	MantineProvider,
	Stack,
	Paper,
	Text,
	Box,
	Group,
	Button,
} from "@mantine/core";
import { theme } from "./theme";
import { AppShell } from "./components/layout/AppShell";
import { GraphCanvas } from "./components/graph/GraphCanvas";
import { ComparisonGraphCanvas } from "./components/comparison/ComparisonGraphCanvas";
import { MIStageComparisonView } from "./components/comparison/MIStageComparisonView";
import { GraphToolbar } from "./components/graph/GraphToolbar";
import { AnimationTimeline } from "./components/animation/AnimationTimeline";
import { StatsOverlay } from "./components/animation/StatsOverlay";
import { AnimationLegend } from "./components/animation/AnimationLegend";
import { PipelinePanel } from "./components/pipeline/PipelinePanel";
import { FrameInspector } from "./components/inspector/FrameInspector";
import { ComparisonTable } from "./components/comparison/ComparisonTable";
import { useUrlSync } from "./components/app/use-url-sync";
import { useGraphStore } from "./state/graph-store";
import { useAnimationStore } from "./state/animation-store";
import { useComparisonStore } from "./state/comparison-store";

import "@mantine/core/styles.css";

function MainContent(): ReactNode {
	const graph = useGraphStore((state) => state.graph);
	const seeds = useGraphStore((state) => state.seeds);

	const frames = useAnimationStore((state) => state.frames);
	const currentFrameIndex = useAnimationStore(
		(state) => state.currentFrameIndex,
	);
	const isPlaying = useAnimationStore((state) => state.isPlaying);
	const speed = useAnimationStore((state) => state.speed);
	const togglePlay = useAnimationStore((state) => state.togglePlay);
	const setFrame = useAnimationStore((state) => state.setFrame);
	const setSpeed = useAnimationStore((state) => state.setSpeed);

	const entries = useComparisonStore((state) => state.entries);
	const miEntries = useComparisonStore((state) => state.miEntries);
	const comparisonStage = useComparisonStore((state) => state.comparisonStage);
	const totalDurationMs = useComparisonStore((state) => state.totalDurationMs);
	const selectedAlgorithms = useComparisonStore(
		(state) => state.selectedAlgorithms,
	);

	const [layoutMode, setLayoutMode] = useState<"single" | "split">("single");

	return (
		<div
			style={{
				display: "flex",
				gap: "var(--mantine-spacing-md)",
				height: "100%",
			}}
		>
			{/* Left Sidebar: Pipeline Panel */}
			<div style={{ width: 280, flexShrink: 0, overflow: "auto" }}>
				<PipelinePanel />
			</div>

			{/* Centre: Graph Canvas + Timeline */}
			<div
				style={{
					flex: 1,
					minWidth: 0,
					display: "flex",
					flexDirection: "column",
					gap: "var(--mantine-spacing-md)",
				}}
			>
				<Paper
					shadow="sm"
					withBorder
					style={{ flex: 1, minHeight: 0, position: "relative" }}
				>
					{layoutMode === "single" ? (
						<GraphCanvas />
					) : comparisonStage === "mi" ? (
						<MIStageComparisonView
							entries={miEntries}
							totalDurationMs={totalDurationMs}
						/>
					) : (
						<ComparisonGraphCanvas algorithms={selectedAlgorithms} />
					)}

					{/* Canvas Overlays */}
					<Box style={{ position: "absolute", top: 16, left: 16, zIndex: 100 }}>
						<GraphToolbar cy={null} />
					</Box>

					<Box
						style={{ position: "absolute", top: 16, right: 16, zIndex: 100 }}
					>
						<Group>
							<Button
								size="xs"
								variant={layoutMode === "single" ? "filled" : "subtle"}
								onClick={() => {
									setLayoutMode("single");
								}}
							>
								Single
							</Button>
							<Button
								size="xs"
								variant={layoutMode === "split" ? "filled" : "subtle"}
								onClick={() => {
									setLayoutMode("split");
								}}
							>
								Compare
							</Button>
						</Group>
					</Box>

					<StatsOverlay />

					<AnimationLegend />
				</Paper>

				<Paper shadow="sm" withBorder p="sm" style={{ flexShrink: 0 }}>
					<AnimationTimeline
						totalFrames={frames.length}
						currentFrameIndex={currentFrameIndex}
						isPlaying={isPlaying}
						onPlay={togglePlay}
						onPause={togglePlay}
						onSeek={setFrame}
						speed={speed}
						onSpeedChange={setSpeed}
					/>
				</Paper>
			</div>

			{/* Right Sidebar: Frame Inspector + Comparison Table */}
			<div style={{ width: 320, flexShrink: 0, overflow: "auto" }}>
				<Stack gap="md" style={{ height: "100%" }}>
					<FrameInspector />

					{entries.length > 0 ||
					(comparisonStage === "mi" && miEntries.length > 0) ? (
						<Paper p="sm" withBorder>
							<ComparisonTable
								entries={entries}
								miEntries={miEntries}
								comparisonStage={comparisonStage}
								totalDurationMs={totalDurationMs}
							/>
						</Paper>
					) : null}

					<Paper p="sm" withBorder>
						<Text size="xs" c="dimmed">
							{Array.from(graph.nodeIds()).length} nodes, {seeds.length} seeds
						</Text>
					</Paper>
				</Stack>
			</div>
		</div>
	);
}

function AppWithSync(): ReactNode {
	useUrlSync();
	return <MainContent />;
}

export function App(): ReactNode {
	return (
		<MantineProvider theme={theme}>
			<AppShell>
				<AppWithSync />
			</AppShell>
		</MantineProvider>
	);
}
