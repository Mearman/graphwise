import { style } from "@vanilla-extract/css";

export const overlayContainer = style({
	position: "absolute",
	inset: 0,
	pointerEvents: "none",
	overflow: "hidden",
	zIndex: 10,
});

export const discoveryNumber = style({
	position: "absolute",
	top: 0,
	left: 0,
	fontSize: 12,
	fontWeight: 700,
	color: "#ffffff",
	textShadow: "0 1px 2px rgba(0,0,0,0.8)",
	transformOrigin: "0 0",
});
