import { style } from "@vanilla-extract/css";
import { tokens } from "../../theme/tokens.css";

export const container = style({
	display: "flex",
	flexDirection: "column",
	gap: tokens.space.md,
	padding: tokens.space.md,
	backgroundColor: tokens.colour.background,
	borderRadius: tokens.radius.md,
});

export const header = style({
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
});

export const title = style({
	fontSize: tokens.fontSize.xs,
	fontWeight: 500,
	color: tokens.colour.text,
	marginBottom: tokens.space.xs,
});

export const progressTrack = style({
	height: tokens.space.xs,
	backgroundColor: tokens.colour.surface,
	borderRadius: tokens.radius.sm,
	position: "relative",
	overflow: "hidden",
	cursor: "pointer",
});

export const progressFill = style({
	height: "100%",
	backgroundColor: tokens.colour.frontier0,
	transition: "width 0.2s ease-in-out",
});

export const progressIndicator = style({
	position: "absolute",
	top: "50%",
	transform: "translate(-50%, -50%)",
	width: tokens.space.md,
	height: tokens.space.md,
	backgroundColor: tokens.colour.background,
	border: `2px solid ${tokens.colour.frontier0}`,
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

export const speedControl = style({
	display: "flex",
	alignItems: "center",
	gap: tokens.space.xs,
});

export const speedSlider = style({
	flex: 1,
});
