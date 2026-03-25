import { Box } from "@mantine/core";
import { useEffect, useRef } from "react";

interface FormulaBlockProps {
	readonly formula: string;
}

interface KaTexInstance {
	render(
		expression: string,
		container: HTMLElement,
		options: { throwOnError: boolean; displayMode: boolean },
	): void;
}

function hasKatexProperty(value: object): value is { katex: unknown } {
	return "katex" in value;
}

function isKaTexAvailable(value: unknown): value is { katex: KaTexInstance } {
	if (typeof value !== "object" || value === null) return false;
	if (!hasKatexProperty(value)) return false;
	// After hasKatexProperty check, value has katex property
	const { katex } = value;
	return typeof katex === "object" && katex !== null;
}

/**
 * Renders a LaTeX formula using KaTeX if available, otherwise shows plain text.
 */
export function FormulaBlock({
	formula,
}: FormulaBlockProps): React.ReactElement {
	const containerRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!containerRef.current) return;

		try {
			// Attempt to use KaTeX if available
			if (isKaTexAvailable(window)) {
				window.katex.render(formula, containerRef.current, {
					throwOnError: false,
					displayMode: true,
				});
			} else {
				// Fallback to plain text
				containerRef.current.textContent = formula;
			}
		} catch {
			containerRef.current.textContent = formula;
		}
	}, [formula]);

	return (
		<Box
			ref={containerRef}
			component="div"
			style={{
				fontFamily: "KaTeX_Main, serif",
				fontSize: "14px",
				padding: "8px",
				backgroundColor: "#f8f9fa",
				borderRadius: "4px",
				overflow: "auto",
			}}
		/>
	);
}
