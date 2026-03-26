import { type ReactNode, useEffect, useCallback } from "react";
import {
	AppShell as MantineAppShell,
	Group,
	Title,
	Switch,
	Stack,
	ActionIcon,
	Tooltip,
	useMantineColorScheme,
	Select,
	Slider,
	NumberInput,
	Popover,
	Box,
	Button,
	SegmentedControl,
	Divider,
} from "@mantine/core";
import {
	IconZoomIn,
	IconZoomOut,
	IconMaximize,
	IconReload,
	IconSun,
	IconMoon,
	IconDeviceDesktop,
	IconPlus,
} from "@tabler/icons-react";
import * as styles from "./AppShell.css";
import { useInteractionStore } from "../../state/interaction-store";
import { useCytoscapeInstancesStore } from "../../state/cytoscape-instances-store";
import { useLayoutStore } from "../../state/layout-store";
import {
	useColorSchemeStore,
	type ColorSchemeMode,
} from "../../state/color-scheme-store";
import { useGraphStore } from "../../state/graph-store";
import { useAnimationStore } from "../../state/animation-store";
import { useColumnStore } from "../../state/column-store";
import { useGenerationStore } from "../../state/generation-store";
import { useAppStore } from "../../state/app-store";
import { runAllColumns } from "../../engine/column-runner";
import { loadFixture, fixtureNames } from "../../engine/fixture-loader";
import { generateRandomGraph } from "../../engine/random-graph-generator";
import { GraphClassToggles } from "../graph/GraphClassToggles";
import { SeedPicker } from "../graph/SeedPicker";
import { AnimationTimeline } from "../animation/AnimationTimeline";

const RANDOM_FIXTURE = "random" as const;

interface AppShellProps {
	readonly children: ReactNode;
}

export function AppShell({ children }: AppShellProps): ReactNode {
	const zoomEnabled = useInteractionStore((state) => state.zoomEnabled);
	const panEnabled = useInteractionStore((state) => state.panEnabled);
	const showDiscoveryNumbers = useInteractionStore(
		(state) => state.showDiscoveryNumbers,
	);
	const setZoomEnabled = useInteractionStore((state) => state.setZoomEnabled);
	const setPanEnabled = useInteractionStore((state) => state.setPanEnabled);
	const setShowDiscoveryNumbers = useInteractionStore(
		(state) => state.setShowDiscoveryNumbers,
	);
	const instances = useCytoscapeInstancesStore((state) => state.instances);
	const resetLayout = useLayoutStore((state) => state.reset);
	const colorSchemeMode = useColorSchemeStore((state) => state.mode);
	const cycleColorScheme = useColorSchemeStore((state) => state.cycleMode);
	const { setColorScheme } = useMantineColorScheme();

	// Graph state
	const seeds = useGraphStore((state) => state.seeds);
	const setGraph = useGraphStore((state) => state.setGraph);
	const setSeeds = useGraphStore((state) => state.setSeeds);
	const graphLoadedFromUrl = useGraphStore((state) => state.graphLoadedFromUrl);

	// Column state
	const viewMode = useColumnStore((state) => state.viewMode);
	const addColumn = useColumnStore((state) => state.addColumn);
	const setViewMode = useColumnStore((state) => state.setViewMode);
	const clearResults = useColumnStore((state) => state.clearResults);

	// Animation state
	const animationReset = useAnimationStore((state) => state.reset);
	const isPlaying = useAnimationStore((state) => state.isPlaying);
	const syncedFrameIndex = useAnimationStore((state) => state.syncedFrameIndex);
	const togglePlay = useAnimationStore((state) => state.togglePlay);
	const setSyncedFrameIndex = useAnimationStore(
		(state) => state.setSyncedFrameIndex,
	);
	const speed = useAnimationStore((state) => state.speed);
	const setSpeed = useAnimationStore((state) => state.setSpeed);
	const maxFrameCount = useAnimationStore((state) => state.maxFrameCount());

	// Generation settings
	const nodeCount = useGenerationStore((state) => state.nodeCount);
	const seed = useGenerationStore((state) => state.seed);
	const graphClass = useGenerationStore((state) => state.graphClass);
	const setNodeCount = useGenerationStore((state) => state.setNodeCount);
	const setSeed = useGenerationStore((state) => state.setSeed);

	// App state
	const selectedFixture = useAppStore((state) => state.selectedFixture);
	const setSelectedFixture = useAppStore((state) => state.setSelectedFixture);

	// Sync Zustand store to Mantine's color scheme
	const handleCycleColorScheme = (): void => {
		cycleColorScheme();
		// Read the updated mode directly from store (avoids stale closure)
		const currentMode = useColorSchemeStore.getState().mode;
		const mantineScheme = currentMode === "system" ? "auto" : currentMode;
		setColorScheme(mantineScheme);
	};

	const handleZoomIn = (): void => {
		for (const cy of instances.values()) {
			cy.zoom(cy.zoom() * 1.2);
		}
	};

	const handleZoomOut = (): void => {
		for (const cy of instances.values()) {
			cy.zoom(cy.zoom() / 1.2);
		}
	};

	const handleFit = (): void => {
		for (const cy of instances.values()) {
			cy.fit(undefined, 50);
		}
	};

	const handleResetLayout = (): void => {
		// Reset shared layout state so all columns re-run CoSE
		resetLayout();
		// Run CoSE layout on all instances
		for (const cy of instances.values()) {
			cy.layout({ name: "cose", animate: true }).run();
		}
	};

	const getColorSchemeIcon = (mode: ColorSchemeMode): ReactNode => {
		switch (mode) {
			case "light":
				return <IconSun size={16} />;
			case "dark":
				return <IconMoon size={16} />;
			case "system":
				return <IconDeviceDesktop size={16} />;
		}
	};

	const getColorSchemeLabel = (mode: ColorSchemeMode): string => {
		switch (mode) {
			case "light":
				return "Light Mode";
			case "dark":
				return "Dark Mode";
			case "system":
				return "System Mode";
		}
	};

	// Load initial fixture on mount (only if not loaded from URL)
	useEffect(() => {
		if (graphLoadedFromUrl) return;

		const fixture = loadFixture("three-community");
		setGraph(fixture.graph, fixture.directed);
		setSeeds(fixture.seeds);
	}, [graphLoadedFromUrl, setGraph, setSeeds]);

	// Regenerate random graph when settings change
	const regenerateRandomGraph = useCallback(() => {
		const generated = generateRandomGraph(nodeCount, seed, graphClass);
		setGraph(generated.graph, graphClass.isDirected);
		setSeeds(generated.seeds);
		animationReset();
		clearResults();
	}, [
		nodeCount,
		seed,
		graphClass,
		setGraph,
		setSeeds,
		animationReset,
		clearResults,
	]);

	// Regenerate when on random fixture and settings change
	useEffect(() => {
		if (selectedFixture === RANDOM_FIXTURE) {
			regenerateRandomGraph();
		}
	}, [selectedFixture, nodeCount, seed, graphClass, regenerateRandomGraph]);

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

	// Calculate dynamic header height
	const TIMELINE_ROW_HEIGHT = 150;
	const headerHeight = maxFrameCount > 0 ? 56 + TIMELINE_ROW_HEIGHT : 56;

	return (
		<MantineAppShell header={{ height: headerHeight }} padding="md">
			<MantineAppShell.Header className={styles.header}>
				<Stack gap={0} h="100%">
					<Group h={56} px="md" gap="xs" wrap="nowrap">
						<Group gap="sm" style={{ flexShrink: 0 }}>
							<Title order={3}>Graphwise</Title>
						</Group>

						{/* Controls */}
						<Group gap="xs" style={{ flex: 1, minWidth: 0 }}>
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
											min={3}
											max={100}
											step={1}
											marks={[
												{ value: 3, label: "3" },
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
									<GraphClassToggles />
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

						{/* Tools */}
						<Group gap="xs" style={{ flexShrink: 0 }}>
							<Tooltip label="Zoom In">
								<ActionIcon
									onClick={handleZoomIn}
									size="sm"
									variant="light"
									aria-label="Zoom In"
								>
									<IconZoomIn size={16} />
								</ActionIcon>
							</Tooltip>
							<Tooltip label="Zoom Out">
								<ActionIcon
									onClick={handleZoomOut}
									size="sm"
									variant="light"
									aria-label="Zoom Out"
								>
									<IconZoomOut size={16} />
								</ActionIcon>
							</Tooltip>
							<Tooltip label="Fit to View">
								<ActionIcon
									onClick={handleFit}
									size="sm"
									variant="light"
									aria-label="Fit to View"
								>
									<IconMaximize size={16} />
								</ActionIcon>
							</Tooltip>
							<Tooltip label="Reset Layout">
								<ActionIcon
									onClick={handleResetLayout}
									size="sm"
									variant="light"
									aria-label="Reset Layout"
								>
									<IconReload size={16} />
								</ActionIcon>
							</Tooltip>
							<Tooltip label={getColorSchemeLabel(colorSchemeMode)}>
								<ActionIcon
									onClick={handleCycleColorScheme}
									size="sm"
									variant="light"
									aria-label={getColorSchemeLabel(colorSchemeMode)}
								>
									{getColorSchemeIcon(colorSchemeMode)}
								</ActionIcon>
							</Tooltip>
							<Group gap="xs">
								<Switch
									size="xs"
									label="Zoom"
									checked={zoomEnabled}
									onChange={(e) => {
										setZoomEnabled(e.currentTarget.checked);
									}}
								/>
								<Switch
									size="xs"
									label="Pan"
									checked={panEnabled}
									onChange={(e) => {
										setPanEnabled(e.currentTarget.checked);
									}}
								/>
								<Switch
									size="xs"
									label="Discovery"
									checked={showDiscoveryNumbers}
									onChange={(e) => {
										setShowDiscoveryNumbers(e.currentTarget.checked);
									}}
								/>
							</Group>
						</Group>
					</Group>
					{maxFrameCount > 0 && (
						<>
							<Divider />
							<Box px="md" py="xs" style={{ flex: 1, minHeight: 0 }}>
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
							</Box>
						</>
					)}
				</Stack>
			</MantineAppShell.Header>
			<MantineAppShell.Main style={{ minHeight: "100vh" }}>
				{children}
			</MantineAppShell.Main>
		</MantineAppShell>
	);
}
