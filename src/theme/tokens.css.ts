import { createGlobalTheme } from "@vanilla-extract/css";

export const tokens = createGlobalTheme(":root", {
	colour: {
		frontier0: "#228be6",
		frontier1: "#40c057",
		frontier2: "#fab005",
		visited: "#868e96",
		path: "#f03e3e",
		pathGold: "#f59f00",
		background: "#ffffff",
		surface: "#f8f9fa",
		border: "#dee2e6",
		text: "#212529",
		textMuted: "#868e96",
	},
	space: {
		xs: "4px",
		sm: "8px",
		md: "16px",
		lg: "24px",
		xl: "32px",
	},
	radius: {
		sm: "4px",
		md: "8px",
		lg: "12px",
	},
	fontSize: {
		xs: "12px",
		sm: "14px",
		md: "16px",
		lg: "18px",
		xl: "24px",
	},
});
