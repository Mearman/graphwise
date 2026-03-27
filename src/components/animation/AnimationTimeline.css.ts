import { style } from "@vanilla-extract/css";
import { space, radius, graphColours } from "../../theme/tokens.css";

export const container = style({
	display: "flex",
	flexDirection: "row",
	gap: space.sm,
	padding: `${space.xs} ${space.md}`,
	alignItems: "center",
	backgroundColor: "var(--mantine-color-body)",
	borderRadius: radius.md,
});

export const controls = style({
	flexShrink: 0,
	alignSelf: "center",
});

export const rightSection = style({
	flex: 1,
	minWidth: 0,
});

export const progressTrack = style({
	height: space.xs,
	backgroundColor: "var(--mantine-color-gray-3)",
	borderRadius: radius.sm,
	position: "relative",
	overflow: "hidden",
	cursor: "pointer",
});

export const progressFill = style({
	height: "100%",
	backgroundColor: graphColours.nodeFrontier,
	transition: "width 0.2s ease-in-out",
});

export const progressIndicator = style({
	position: "absolute",
	top: "50%",
	transform: "translate(-50%, -50%)",
	width: space.md,
	height: space.md,
	backgroundColor: "var(--mantine-color-body)",
	border: `2px solid ${graphColours.nodeFrontier}`,
	borderRadius: "50%",
	cursor: "pointer",
	transition: "all 0.2s ease-in-out",
	selectors: {
		"&:hover": {
			transform: "translate(-50%, -50%) scale(1.2)",
		},
		"&:active": {
			transform: "translate(-50%, -50%) scale(1.1)",
		},
	},
});

export const speedSelect = style({
	minWidth: "80px",
});
