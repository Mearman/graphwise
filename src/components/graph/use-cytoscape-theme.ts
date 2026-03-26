import { useEffect } from "react";
import { useComputedColorScheme } from "@mantine/core";
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
	const computedColorScheme = useComputedColorScheme("light");

	useEffect(() => {
		if (!cy) return;

		// Update Cytoscape stylesheet with theme-appropriate colours
		const styles = createStyles(directed, computedColorScheme);
		cy.style([...styles]);
	}, [cy, directed, computedColorScheme]);
}
