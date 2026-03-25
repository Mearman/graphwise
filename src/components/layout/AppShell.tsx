import { type ReactNode } from "react";
import {
	AppShell as MantineAppShell,
	Group,
	Title,
	Text,
	Switch,
	Stack,
} from "@mantine/core";
import * as styles from "./AppShell.css";
import { useInteractionStore } from "../../state/interaction-store";

interface AppShellProps {
	readonly children: ReactNode;
}

export function AppShell({ children }: AppShellProps): ReactNode {
	const zoomEnabled = useInteractionStore((state) => state.zoomEnabled);
	const panEnabled = useInteractionStore((state) => state.panEnabled);
	const setZoomEnabled = useInteractionStore((state) => state.setZoomEnabled);
	const setPanEnabled = useInteractionStore((state) => state.setPanEnabled);

	return (
		<MantineAppShell header={{ height: 56 }} padding="md">
			<MantineAppShell.Header className={styles.header}>
				<Group h="100%" px="md" justify="space-between">
					<Group gap="sm">
						<Title order={3}>Graphwise</Title>
						<Text size="sm" c="dimmed">
							Interactive Algorithm Visualisation
						</Text>
					</Group>
					<Stack gap={2}>
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
					</Stack>
				</Group>
			</MantineAppShell.Header>
			<MantineAppShell.Main style={{ minHeight: "100vh" }}>
				{children}
			</MantineAppShell.Main>
		</MantineAppShell>
	);
}
