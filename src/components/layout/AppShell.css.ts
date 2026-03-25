import { style } from "@vanilla-extract/css";
import { tokens } from "../../theme/tokens.css";

export const header = style({
	borderBottom: `1px solid ${tokens.colour.border}`,
});
