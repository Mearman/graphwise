import { ActionIcon, Group, Tooltip, Switch, Stack } from "@mantine/core";
import {
	IconZoomIn,
	IconZoomOut,
	IconMaximize,
	IconReload,
} from "@tabler/icons-react";
import type { Core } from "cytoscape";
import * as styles from "./GraphToolbar.css";
import React from "react";
import { useInteractionStore } from "../../state/interaction-store";

export interface GraphToolbarProps {
	readonly cy: Core | null;
}

export function GraphToolbar({
	cy,
}: GraphToolbarProps): React.ReactElement | null {
	const zoomEnabled = useInteractionStore((state) => state.zoomEnabled);
	const panEnabled = useInteractionStore((state) => state.panEnabled);
	const setZoomEnabled = useInteractionStore((state) => state.setZoomEnabled);
	const setPanEnabled = useInteractionStore((state) => state.setPanEnabled);

	if (!cy) {
		return null;
	}

	const handleZoomIn = (): void => {
		cy.zoom(cy.zoom() * 1.2);
	};

	const handleZoomOut = (): void => {
		cy.zoom(cy.zoom() / 1.2);
	};

	const handleFit = (): void => {
		cy.fit(undefined, 50);
	};

	const handleResetLayout = (): void => {
		cy.layout({ name: "cose", animate: true }).run();
	};

	return (
		<Group className={styles.toolbar} justify="space-between">
			<Group gap="xs">
				<Tooltip label="Zoom In">
					<ActionIcon onClick={handleZoomIn} size="sm" aria-label="Zoom In">
						<IconZoomIn size={16} />
					</ActionIcon>
				</Tooltip>
				<Tooltip label="Zoom Out">
					<ActionIcon onClick={handleZoomOut} size="sm" aria-label="Zoom Out">
						<IconZoomOut size={16} />
					</ActionIcon>
				</Tooltip>
				<Tooltip label="Fit to View">
					<ActionIcon onClick={handleFit} size="sm" aria-label="Fit to View">
						<IconMaximize size={16} />
					</ActionIcon>
				</Tooltip>
				<Tooltip label="Reset Layout">
					<ActionIcon
						onClick={handleResetLayout}
						size="sm"
						aria-label="Reset Layout"
					>
						<IconReload size={16} />
					</ActionIcon>
				</Tooltip>
			</Group>
			<Stack gap={4}>
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
	);
}
