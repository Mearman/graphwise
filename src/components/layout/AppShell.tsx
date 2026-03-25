import { type ReactNode } from "react";
import { AppShell as MantineAppShell, Group, Title, Text } from "@mantine/core";
import * as styles from "./AppShell.css";

interface AppShellProps {
	readonly children: ReactNode;
}

export function AppShell({ children }: AppShellProps): ReactNode {
	return (
		<MantineAppShell header={{ height: 56 }} padding="md">
			<MantineAppShell.Header className={styles.header}>
				<Group h="100%" px="md">
					<Group gap="sm">
						<Title order={3}>Graphwise</Title>
						<Text size="sm" c="dimmed">
							Interactive Algorithm Visualisation
						</Text>
					</Group>
				</Group>
			</MantineAppShell.Header>
			<MantineAppShell.Main style={{ minHeight: "100vh" }}>
				{children}
			</MantineAppShell.Main>
		</MantineAppShell>
	);
}
