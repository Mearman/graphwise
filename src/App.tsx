import { type ReactNode, useEffect, useCallback } from "react";
import {
	MantineProvider,
	useMantineColorScheme,
	Stack,
	Paper,
	Box,
	Group,
	Button,
	Text,
	ActionIcon,
	SegmentedControl,
	Popover,
	Select,
	Slider,
	NumberInput,
} from "@mantine/core";
import { IconPlus } from "@tabler/icons-react";
import { theme } from "./theme";
import { AppShell } from "./components/layout/AppShell";
import { AnimationTimeline } from "./components/animation/AnimationTimeline";
import { PipelineColumn } from "./components/column/PipelineColumn";
import { OverlayCanvas, OverlayLegend } from "./components/overlay";
import { SeedPicker } from "./components/graph/SeedPicker";
import { useUrlSync } from "./components/app/use-url-sync";
import { useGraphStore } from "./state/graph-store";
import { useAnimationStore } from "./state/animation-store";
import { useColumnStore } from "./state/column-store";
import { useGenerationStore } from "./state/generation-store";
import { useAppStore } from "./state/app-store";
import { useColorSchemeStore } from "./state/color-scheme-store";
import { runAllColumns } from "./engine/column-runner";
import { loadFixture, fixtureNames } from "./engine/fixture-loader";
import { generateRandomGraph } from "./engine/random-graph-generator";

import "@mantine/core/styles.css";

const RANDOM_FIXTURE = "random" as const;

function MainContent(): ReactNode {
	const seeds = useGraphStore((state) => state.seeds);
	const setGraph = useGraphStore((state) => state.setGraph);
	const setSeeds = useGraphStore((state) => state.setSeeds);
	const columns = useColumnStore((state) => state.columns);
	const viewMode = useColumnStore((state) => state.viewMode);
	const addColumn = useColumnStore((state) => state.addColumn);
	const setViewMode = useColumnStore((state) => state.setViewMode);
	const clearResults = useColumnStore((state) => state.clearResults);

	const isPlaying = useAnimationStore((state) => state.isPlaying);
	const syncedFrameIndex = useAnimationStore((state) => state.syncedFrameIndex);
	const togglePlay = useAnimationStore((state) => state.togglePlay);
	const setSyncedFrameIndex = useAnimationStore(
		(state) => state.setSyncedFrameIndex,
	);
	const speed = useAnimationStore((state) => state.speed);
	const setSpeed = useAnimationStore((state) => state.setSpeed);
	const maxFrameCount = useAnimationStore((state) => state.maxFrameCount());
	const animationReset = useAnimationStore((state) => state.reset);

	// Generation settings
	const nodeCount = useGenerationStore((state) => state.nodeCount);
	const seed = useGenerationStore((state) => state.seed);
	const setNodeCount = useGenerationStore((state) => state.setNodeCount);
	const setSeed = useGenerationStore((state) => state.setSeed);

	const selectedFixture = useAppStore((state) => state.selectedFixture);
	const setSelectedFixture = useAppStore((state) => state.setSelectedFixture);

	const graphLoadedFromUrl = useGraphStore((state) => state.graphLoadedFromUrl);

	// Load initial fixture on mount (only if not loaded from URL)
	useEffect(() => {
		if (graphLoadedFromUrl) return;

		const fixture = loadFixture("three-community");
		setGraph(fixture.graph, fixture.directed);
		setSeeds(fixture.seeds);
	}, [graphLoadedFromUrl, setGraph, setSeeds]);

	// Regenerate random graph when settings change
	const regenerateRandomGraph = useCallback(() => {
		const generated = generateRandomGraph(nodeCount, seed);
		setGraph(generated.graph, false);
		setSeeds(generated.seeds);
		animationReset();
		clearResults();
	}, [nodeCount, seed, setGraph, setSeeds, animationReset, clearResults]);

	// Regenerate when on random fixture and settings change
	useEffect(() => {
		if (selectedFixture === RANDOM_FIXTURE) {
			regenerateRandomGraph();
		}
	}, [selectedFixture, nodeCount, seed, regenerateRandomGraph]);

	const handleRunAll = (): void => {
		runAllColumns();
	};

	const handleFixtureChange = (name: string | null): void => {
		if (name === null) return;
		if (name === RANDOM_FIXTURE) {
			setSelectedFixture(RANDOM_FIXTURE);
			regenerateRandomGraph();
			return;
		}
		const fixtureNames_ = fixtureNames();
		for (const fixtureName of fixtureNames_) {
			if (fixtureName === name) {
				const fixture = loadFixture(fixtureName);
				setGraph(fixture.graph, fixture.directed);
				setSeeds(fixture.seeds);
				animationReset();
				clearResults();
				setSelectedFixture(name);
				return;
			}
		}
	};

	return (
		<Stack gap={0} h="100%">
			{/* Header */}
			<Paper shadow="sm" withBorder p="md" style={{ flexShrink: 0 }}>
				<Group justify="space-between">
					<Text fw={600} size="lg">
						Graphwise Demo
					</Text>
					<Group>
						{/* Dataset Selector */}
						<Select
							size="xs"
							placeholder="Dataset"
							value={selectedFixture}
							onChange={handleFixtureChange}
							data={[
								{ value: RANDOM_FIXTURE, label: "Random Graph" },
								...fixtureNames().map((name) => ({
									value: name,
									label: loadFixture(name).description,
								})),
							]}
							w={220}
						/>

						{/* Generation Controls - only show for Random */}
						{selectedFixture === RANDOM_FIXTURE && (
							<Group gap="xs">
								<Box w={120}>
									<Slider
										size="xs"
										label={(val) => `${String(val)} nodes`}
										value={nodeCount}
										onChange={(value) => {
											setNodeCount(typeof value === "number" ? value : 20);
										}}
										min={5}
										max={100}
										step={5}
										marks={[
											{ value: 5, label: "5" },
											{ value: 50, label: "50" },
											{ value: 100, label: "100" },
										]}
									/>
								</Box>
								<NumberInput
									size="xs"
									placeholder="Seed"
									value={seed}
									onChange={(value) => {
										setSeed(typeof value === "number" ? value : 42);
									}}
									min={0}
									max={999999}
									w={80}
								/>
							</Group>
						)}

						{/* Seed Picker Popover */}
						<Popover position="bottom-start">
							<Popover.Target>
								<Button size="xs" variant="light">
									Seeds ({seeds.length})
								</Button>
							</Popover.Target>
							<Popover.Dropdown>
								<Box w={300}>
									<SeedPicker />
								</Box>
							</Popover.Dropdown>
						</Popover>

						{/* View Mode Toggle */}
						<SegmentedControl
							size="xs"
							value={viewMode}
							onChange={(value) => {
								const mode = value === "overlay" ? "overlay" : "columns";
								setViewMode(mode);
							}}
							data={[
								{ label: "Columns", value: "columns" },
								{ label: "Overlay", value: "overlay" },
							]}
						/>

						{/* Add Column Button */}
						<ActionIcon
							size="sm"
							variant="light"
							title="Add Column"
							onClick={addColumn}
						>
							<IconPlus size={16} />
						</ActionIcon>

						{/* Run All Button */}
						<Button size="xs" onClick={handleRunAll}>
							Run All
						</Button>
					</Group>
				</Group>
			</Paper>

			{/* Main Content */}
			<Stack
				gap="md"
				style={{ flex: 1, minHeight: 0, overflow: "hidden" }}
				p="md"
			>
				{/* Global Animation Timeline */}
				{maxFrameCount > 0 && (
					<Paper shadow="sm" withBorder p="sm">
						<AnimationTimeline
							totalFrames={maxFrameCount}
							currentFrameIndex={syncedFrameIndex}
							isPlaying={isPlaying}
							onPlay={togglePlay}
							onPause={togglePlay}
							onSeek={setSyncedFrameIndex}
							speed={speed}
							onSpeedChange={setSpeed}
						/>
					</Paper>
				)}

				{/* Content: Columns or Overlay */}
				{viewMode === "columns" ? (
					<Box
						style={{
							display: "grid",
							gridAutoFlow: "column",
							gridAutoColumns: "400px",
							gap: "var(--mantine-spacing-md)",
							overflowX: "auto",
							flex: 1,
							minHeight: 0,
							scrollBehavior: "smooth",
						}}
					>
						{columns.map((column) => (
							<Box
								key={column.id}
								style={{
									display: "flex",
									flexDirection: "column",
								}}
							>
								<PipelineColumn columnId={column.id} />
							</Box>
						))}
					</Box>
				) : (
					<Stack gap="md" style={{ flex: 1, minHeight: 0 }}>
						<Paper
							shadow="sm"
							withBorder
							p="sm"
							style={{
								flex: 1,
								minHeight: 0,
								position: "relative",
								display: "flex",
								flexDirection: "column",
							}}
						>
							<OverlayCanvas />
						</Paper>
						<Paper shadow="sm" withBorder p="sm">
							<OverlayLegend />
						</Paper>
					</Stack>
				)}
			</Stack>
		</Stack>
	);
}

function AppWithSync(): ReactNode {
	useUrlSync();
	return <MainContent />;
}

/** Syncs color scheme store with Mantine's color scheme */
function ColorSchemeSync(): null {
	const mode = useColorSchemeStore((state) => state.mode);
	const { setColorScheme } = useMantineColorScheme();

	useEffect(() => {
		if (mode === "system") {
			setColorScheme("auto");
		} else {
			setColorScheme(mode);
		}
	}, [mode, setColorScheme]);

	return null;
}

export function App(): ReactNode {
	return (
		<MantineProvider theme={theme}>
			<ColorSchemeSync />
			<AppShell>
				<AppWithSync />
			</AppShell>
		</MantineProvider>
	);
}
