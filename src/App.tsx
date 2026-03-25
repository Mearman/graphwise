import { type ReactNode, useCallback } from "react";
import { MantineProvider, Stack, Paper, Text, Select } from "@mantine/core";
import { theme } from "./theme";
import { AppShell } from "./components/layout/AppShell";
import { GraphCanvas } from "./components/graph/GraphCanvas";
import { GraphToolbar } from "./components/graph/GraphToolbar";
import { SeedPicker } from "./components/graph/SeedPicker";
import { AnimationTimeline } from "./components/animation/AnimationTimeline";
import { ComparisonPanel } from "./components/comparison/ComparisonPanel";
import { useUrlSync } from "./components/app/use-url-sync";
import { useGraphStore } from "./state/graph-store";
import { useAnimationStore } from "./state/animation-store";
import {
	loadFixture,
	fixtureNames,
	type FixtureName,
} from "./engine/fixture-loader";

import "@mantine/core/styles.css";

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

function MainContent(): ReactNode {
	const graph = useGraphStore((state) => state.graph);
	const seeds = useGraphStore((state) => state.seeds);
	const setGraph = useGraphStore((state) => state.setGraph);
	const setSeeds = useGraphStore((state) => state.setSeeds);

	const frames = useAnimationStore((state) => state.frames);
	const currentFrameIndex = useAnimationStore(
		(state) => state.currentFrameIndex,
	);
	const isPlaying = useAnimationStore((state) => state.isPlaying);
	const speed = useAnimationStore((state) => state.speed);
	const togglePlay = useAnimationStore((state) => state.togglePlay);
	const setFrame = useAnimationStore((state) => state.setFrame);
	const setSpeed = useAnimationStore((state) => state.setSpeed);

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

	const fixtureOptions = fixtureNames().map((name) => ({
		value: name,
		label: name,
	}));

	return (
		<div
			style={{
				display: "flex",
				gap: "var(--mantine-spacing-md)",
				height: "100%",
			}}
		>
			<div style={{ width: "16.67%", flexShrink: 0 }}>
				<Stack gap="md">
					<Paper p="sm" withBorder>
						<Text size="sm" fw={500} mb="xs">
							Load Fixture
						</Text>
						<Select
							size="xs"
							placeholder="Select a graph..."
							data={fixtureOptions}
							onChange={handleLoadFixture}
						/>
					</Paper>
					<GraphToolbar cy={null} />
					<SeedPicker />
				</Stack>
			</div>

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

			<div style={{ width: "25%", flexShrink: 0, overflow: "auto" }}>
				<Stack gap="md" style={{ height: "100%" }}>
					<ComparisonPanel />

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
