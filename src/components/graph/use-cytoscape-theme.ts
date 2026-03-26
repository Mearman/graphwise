import { useEffect } from "react";
import { useMantineColorScheme } from "@mantine/core";
import type { Core } from "cytoscape";
import { createStyles } from "./cytoscape-styles";

export interface UseCytoscapeThemeOptions {
	readonly cy: Core | null;
	readonly directed: boolean;
}

/**
 * Hook that updates Cytoscape styles when the color scheme changes.
 * Cytoscape cannot read CSS variables, so we need to update styles dynamically.
 */
export function useCytoscapeTheme(options: UseCytoscapeThemeOptions): void {
	const { cy, directed } = options;
	const { colorScheme } = useMantineColorScheme();

	useEffect(() => {
		if (!cy) return;

		// Update Cytoscape stylesheet with theme-appropriate colours
		const styles = createStyles(
			directed,
			colorScheme === "dark" ? "dark" : "light",
		);
		cy.style([...styles]);
	}, [cy, directed, colorScheme]);
}
