import { style } from "@vanilla-extract/css";
import { space } from "../../theme/tokens.css";

export const container = style({
	display: "flex",
	flexDirection: "column",
	gap: space.md,
});
