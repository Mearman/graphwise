import { type ReactNode } from "react";
import {
	MantineProvider,
	Stack,
	Paper,
	Box,
	Group,
	Button,
	Text,
	ActionIcon,
	SegmentedControl,
	Popover,
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
import { runAllColumns } from "./engine/column-runner";

import "@mantine/core/styles.css";

function MainContent(): ReactNode {
	const seeds = useGraphStore((state) => state.seeds);
	const columns = useColumnStore((state) => state.columns);
	const viewMode = useColumnStore((state) => state.viewMode);
	const addColumn = useColumnStore((state) => state.addColumn);
	const setViewMode = useColumnStore((state) => state.setViewMode);

	const isPlaying = useAnimationStore((state) => state.isPlaying);
	const syncedFrameIndex = useAnimationStore((state) => state.syncedFrameIndex);
	const togglePlay = useAnimationStore((state) => state.togglePlay);
	const setSyncedFrameIndex = useAnimationStore(
		(state) => state.setSyncedFrameIndex,
	);
	const speed = useAnimationStore((state) => state.speed);
	const setSpeed = useAnimationStore((state) => state.setSpeed);
	const maxFrameCount = useAnimationStore((state) => state.maxFrameCount());

	const handleRunAll = (): void => {
		runAllColumns();
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
							display: "flex",
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
									minWidth: 500,
									flex: "0 0 500px",
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

export function App(): ReactNode {
	return (
		<MantineProvider theme={theme}>
			<AppShell>
				<AppWithSync />
			</AppShell>
		</MantineProvider>
	);
}
