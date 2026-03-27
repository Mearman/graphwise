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
import { PipelineColumn } from "./components/column/PipelineColumn";
import { OverlayCanvas, OverlayLegend } from "./components/overlay";
import { useUrlSync } from "./components/app/use-url-sync";
import { useColumnStore } from "./state/column-store";
import { useColorSchemeStore } from "./state/color-scheme-store";

import "@mantine/core/styles.css";

function MainContent(): ReactNode {
	const columns = useColumnStore((state) => state.columns);
	const viewMode = useColumnStore((state) => state.viewMode);

	return (
		<Stack
			gap="md"
			style={{ flex: 1, minHeight: 0, overflow: "hidden" }}
			p="md"
		>
			{/* Content: Columns or Overlay */}
			{viewMode === "columns" ? (
				<Box
					style={{
						display: "flex",
						justifyContent: "safe center",
						gap: "var(--mantine-spacing-md)",
						flex: 1,
						minHeight: 0,
						overflowX: "auto",
					}}
				>
					{columns.map((column) => (
						<Box
							key={column.id}
							style={{
								display: "flex",
								flexDirection: "column",
								flex: "1 0 calc(0.75 * min(100vw, 100vh) / 2)",
								maxWidth: "calc(0.75 * min(100vw, 100vh))",
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
