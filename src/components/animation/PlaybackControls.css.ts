import { style } from "@vanilla-extract/css";
import { tokens } from "../../theme/tokens.css";

export const container = style({
	display: "flex",
	flexDirection: "column",
	gap: tokens.space.md,
});
