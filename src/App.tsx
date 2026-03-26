import { type ReactNode, useEffect } from "react";
import {
	MantineProvider,
	useMantineColorScheme,
	Stack,
	Box,
	Paper,
} from "@mantine/core";
import { theme } from "./theme";
import { AppShell } from "./components/layout/AppShell";
import { AnimationTimeline } from "./components/animation/AnimationTimeline";
import { PipelineColumn } from "./components/column/PipelineColumn";
import { OverlayCanvas, OverlayLegend } from "./components/overlay";
import { useUrlSync } from "./components/app/use-url-sync";
import { useGraphStore } from "./state/graph-store";
import { useAnimationStore } from "./state/animation-store";
import { useColumnStore } from "./state/column-store";
import { useColorSchemeStore } from "./state/color-scheme-store";

import "@mantine/core/styles.css";

function MainContent(): ReactNode {
	const columns = useColumnStore((state) => state.columns);
	const viewMode = useColumnStore((state) => state.viewMode);

	const isPlaying = useAnimationStore((state) => state.isPlaying);
	const syncedFrameIndex = useAnimationStore((state) => state.syncedFrameIndex);
	const togglePlay = useAnimationStore((state) => state.togglePlay);
	const setSyncedFrameIndex = useAnimationStore(
		(state) => state.setSyncedFrameIndex,
	);
	const speed = useAnimationStore((state) => state.speed);
	const setSpeed = useAnimationStore((state) => state.setSpeed);
	const maxFrameCount = useAnimationStore((state) => state.maxFrameCount());

	return (
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
							gridAutoColumns: "1fr",
							gap: "var(--mantine-spacing-md)",
							flex: 1,
							minHeight: 0,
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
