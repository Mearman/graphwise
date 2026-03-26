import { type ReactNode } from "react";
import {
	AppShell as MantineAppShell,
	Group,
	Title,
	Text,
	Switch,
	Stack,
	ActionIcon,
	Tooltip,
} from "@mantine/core";
import {
	IconZoomIn,
	IconZoomOut,
	IconMaximize,
	IconReload,
} from "@tabler/icons-react";
import * as styles from "./AppShell.css";
import { useInteractionStore } from "../../state/interaction-store";
import { useCytoscapeInstancesStore } from "../../state/cytoscape-instances-store";
import { useLayoutStore } from "../../state/layout-store";

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
					<Group gap="xs">
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
							<Switch
								size="xs"
								label="Discovery"
								checked={showDiscoveryNumbers}
								onChange={(e) => {
									setShowDiscoveryNumbers(e.currentTarget.checked);
								}}
							/>
						</Stack>
					</Group>
				</Group>
			</MantineAppShell.Header>
			<MantineAppShell.Main style={{ minHeight: "100vh" }}>
				{children}
			</MantineAppShell.Main>
		</MantineAppShell>
	);
}
