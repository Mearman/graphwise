import { type ReactNode } from "react";
import { MantineProvider, Stack, Paper, Text, Box } from "@mantine/core";
import { theme } from "./theme";
import { AppShell } from "./components/layout/AppShell";
import { GraphCanvas } from "./components/graph/GraphCanvas";
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
	const totalDurationMs = useComparisonStore((state) => state.totalDurationMs);

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
					<GraphCanvas />

					{/* Canvas Overlays */}
					<Box style={{ position: "absolute", top: 16, left: 16, zIndex: 100 }}>
						<GraphToolbar cy={null} />
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

					{entries.length > 0 ? (
						<Paper p="sm" withBorder>
							<ComparisonTable
								entries={entries}
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
