import { style } from "@vanilla-extract/css"
import { space, radius } from "../../theme/tokens.css"

export const container = style({
	display: "flex",
	flexDirection: "column",
	gap: space.xs,
	padding: `${space.xs} ${space.md}`,
	backgroundColor: "var(--mantine-color-body)",
	borderRadius: radius.md,
})

export const chartArea = style({
	position: "relative",
	cursor: "ew-resize",
	userSelect: "none",
})

export const controls = style({
	display: "flex",
	flexDirection: "row",
	gap: space.sm,
	alignItems: "center",
})

export const speedSelect = style({
	minWidth: "80px",
})

export const legend = style({
	display: "flex",
	flexDirection: "row",
	gap: space.md,
	alignItems: "center",
	flexWrap: "wrap",
})
