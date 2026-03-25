import { type ReactNode, useCallback } from "react";
import { Box, Tooltip, Text, Stack, Group } from "@mantine/core";
import type { TimelineEvent } from "../../engine/frame-types";

export interface PathTimelineProps {
	/** All timeline events */
	readonly events: readonly TimelineEvent[];
	/** Total number of frames */
	readonly totalFrames: number;
	/** Current frame index */
	readonly currentFrameIndex: number;
	/** Callback when user clicks an event to seek to that frame */
	readonly onSeek: (frameIndex: number) => void;
}

export function PathTimeline({
	events,
	totalFrames,
	currentFrameIndex,
	onSeek,
}: PathTimelineProps): ReactNode {
	const pathEvents = events.filter((e) => e.type === "path-discovered");
	const phaseEvents = events.filter((e) => e.type === "phase-transition");

	const getEventColour = (type: string): string => {
		switch (type) {
			case "path-discovered":
				return "var(--mantine-color-yellow-6)";
			case "phase-transition":
				return "var(--mantine-color-gray-5)";
			case "termination":
				return "var(--mantine-color-red-6)";
			default:
				return "var(--mantine-color-gray-4)";
		}
	};

	const handleClick = useCallback(
		(frameIndex: number) => {
			onSeek(frameIndex);
		},
		[onSeek],
	);

	if (events.length === 0 || totalFrames <= 1) {
		return (
			<Text size="xs" c="dimmed">
				No events yet
			</Text>
		);
	}

	return (
		<Stack gap={4}>
			<Text size="xs" fw={500}>
				Event Timeline
			</Text>
			<Box
				style={{
					position: "relative",
					height: 24,
					backgroundColor: "var(--mantine-color-gray-1)",
					borderRadius: 4,
					cursor: "pointer",
				}}
			>
				{/* Progress line */}
				<div
					style={{
						position: "absolute",
						top: "50%",
						left: 0,
						right: 0,
						height: 2,
						backgroundColor: "var(--mantine-color-gray-3)",
						transform: "translateY(-50%)",
					}}
				/>

				{/* Current position indicator */}
				<div
					style={{
						position: "absolute",
						top: "50%",
						left: `${String((currentFrameIndex / (totalFrames - 1)) * 100)}%`,
						width: 2,
						height: 16,
						backgroundColor: "var(--mantine-color-blue-6)",
						transform: "translate(-50%, -50%)",
						borderRadius: 1,
					}}
				/>

				{/* Event markers */}
				{events.map((event, idx) => {
					const leftPercent =
						totalFrames > 1 ? (event.frameIndex / (totalFrames - 1)) * 100 : 50;
					return (
						<Tooltip
							key={`${event.type}-${String(idx)}`}
							label={`${event.label} (frame ${String(event.frameIndex + 1)})`}
							position="top"
						>
							<div
								style={{
									position: "absolute",
									top: "50%",
									left: `${String(leftPercent)}%`,
									width: event.type === "termination" ? 10 : 8,
									height: event.type === "termination" ? 10 : 8,
									backgroundColor: getEventColour(event.type),
									borderRadius: "50%",
									transform: "translate(-50%, -50%)",
									cursor: "pointer",
									transition: "transform 0.1s ease",
								}}
								onClick={() => {
									handleClick(event.frameIndex);
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.transform =
										"translate(-50%, -50%) scale(1.3)";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.transform =
										"translate(-50%, -50%) scale(1)";
								}}
							/>
						</Tooltip>
					);
				})}
			</Box>

			<Group justify="space-between">
				<Text size="xs" c="dimmed">
					{pathEvents.length} paths found
				</Text>
				<Text size="xs" c="dimmed">
					{phaseEvents.length} phase changes
				</Text>
			</Group>
		</Stack>
	);
}
