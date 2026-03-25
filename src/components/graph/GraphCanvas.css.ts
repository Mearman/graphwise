import { style } from "@vanilla-extract/css";

export const canvas = style({
	position: "relative",
	width: "100%",
	height: "100%",
	minHeight: 200,
	backgroundColor: "#f8fafc",
	borderRadius: 8,
	selectors: {
		'&[data-ready="true"]': {
			opacity: 1,
		},
		'&[data-ready="false"]': {
			opacity: 0,
		},
	},
});

export const transition = style({
	transition: "opacity 200ms ease",
});
