import { useCallback, useMemo, useRef, useEffect, useState } from "react";
import {
	Box,
	Group,
	Button,
	Text,
	Tooltip,
	ActionIcon,
	Select,
} from "@mantine/core";
import {
	IconPlayerPlay,
	IconPlayerPause,
	IconPlayerSkipBack,
	IconPlayerSkipForward,
	IconChevronLeft,
	IconChevronRight,
} from "@tabler/icons-react";
import { scaleLinear } from "d3-scale";
import { useAnimationStore } from "../../state/animation-store";
import { useColumnStore } from "../../state/column-store";
import { buildDiscoveryCurve } from "../../engine/discovery-curve";
import { columnColour } from "../../theme/column-colours";
import * as styles from "./DiscoveryTimeline.css";

export interface DiscoveryTimelineProps {
	readonly totalFrames: number;
	readonly currentFrameIndex: number;
	readonly isPlaying: boolean;
	readonly onPlay: () => void;
	readonly onPause: () => void;
	readonly onSeek: (frame: number) => void;
	readonly speed: number;
	readonly onSpeedChange: (speed: number) => void;
	readonly maxFrameCount: number;
	readonly frameDisplayMode: "absolute" | "relative";
}

const SVG_HEIGHT = 64;
const LEFT_PAD = 4;
const RIGHT_PAD = 4;
const TOP_PAD = 6;
const BOTTOM_PAD = 6;

export function DiscoveryTimeline({
	totalFrames,
	currentFrameIndex,
	isPlaying,
	onPlay,
	onPause,
	onSeek,
	speed,
	onSpeedChange,
	maxFrameCount,
	frameDisplayMode,
}: DiscoveryTimelineProps): React.ReactElement {
	const columns = useColumnStore((state) => state.columns);
	const algorithmFrames = useAnimationStore((state) => state.algorithmFrames);
	const syncedFrameIndex = useAnimationStore((state) => state.syncedFrameIndex);
	const setSyncedFrameIndex = useAnimationStore(
		(state) => state.setSyncedFrameIndex,
	);

	const [localSpeed, setLocalSpeed] = useState(speed);
	const [localIsPlaying, setLocalIsPlaying] = useState(isPlaying);

	useEffect(() => {
		setLocalSpeed(speed);
	}, [speed]);
	useEffect(() => {
		setLocalIsPlaying(isPlaying);
	}, [isPlaying]);

	const columnCurves = useMemo(() => {
		return columns
			.map((col, index) => {
				if (col.expansionAlgorithm === null) return null;
				const frames = algorithmFrames[col.expansionAlgorithm] ?? [];
				if (frames.length === 0) return null;
				return {
					index,
					algorithmName: col.expansionAlgorithm,
					curve: buildDiscoveryCurve(frames),
					colour: columnColour(index),
				};
			})
			.filter((c): c is NonNullable<typeof c> => c !== null);
	}, [columns, algorithmFrames]);

	const hasCurves = columnCurves.length > 0;
	const effectiveMaxFrame = hasCurves
		? Math.max(
				...columnCurves.map(
					(c) => c.curve[c.curve.length - 1]?.frameIndex ?? 0,
				),
			)
		: Math.max(maxFrameCount - 1, 1);
	const maxPaths = hasCurves
		? Math.max(
				...columnCurves.map((c) => c.curve[c.curve.length - 1]?.pathCount ?? 0),
			)
		: 1;

	const xScale = useMemo(
		() =>
			scaleLinear()
				.domain([0, Math.max(effectiveMaxFrame, 1)])
				.range([LEFT_PAD, 100 - RIGHT_PAD]),
		[effectiveMaxFrame],
	);
	const yScale = useMemo(
		() =>
			scaleLinear()
				.domain([0, Math.max(maxPaths, 1)])
				.range([SVG_HEIGHT - BOTTOM_PAD, TOP_PAD]),
		[maxPaths],
	);

	const svgRef = useRef<SVGSVGElement>(null);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent<SVGSVGElement>) => {
			if (!hasCurves) return;
			e.preventDefault();
			const svg = svgRef.current;
			if (svg === null) return;

			const seek = (clientX: number): void => {
				const rect = svg.getBoundingClientRect();
				const leftOffset = (LEFT_PAD / 100) * rect.width;
				const rightOffset = (RIGHT_PAD / 100) * rect.width;
				const plotWidth = rect.width - leftOffset - rightOffset;
				const x = clientX - rect.left - leftOffset;
				const pct = Math.max(0, Math.min(1, x / plotWidth));
				const frame = Math.round(pct * effectiveMaxFrame);
				setSyncedFrameIndex(Math.min(frame, totalFrames - 1));
			};

			seek(e.clientX);

			const handleMove = (moveEvent: MouseEvent): void => {
				seek(moveEvent.clientX);
			};
			const handleUp = (): void => {
				document.removeEventListener("mousemove", handleMove);
				document.removeEventListener("mouseup", handleUp);
			};
			document.addEventListener("mousemove", handleMove);
			document.addEventListener("mouseup", handleUp);
		},
		[hasCurves, effectiveMaxFrame, totalFrames, setSyncedFrameIndex],
	);

	const handlePlayToggle = useCallback(() => {
		if (localIsPlaying) {
			onPause();
		} else {
			onPlay();
		}
		setLocalIsPlaying(!localIsPlaying);
	}, [localIsPlaying, onPlay, onPause]);

	const handleFrameSeek = useCallback(
		(direction: "prev" | "next") => {
			if (direction === "prev") {
				onSeek(Math.max(0, currentFrameIndex - 1));
			} else {
				onSeek(Math.min(totalFrames - 1, currentFrameIndex + 1));
			}
		},
		[currentFrameIndex, totalFrames, onSeek],
	);

	const handleSpeedChange = useCallback(
		(value: number) => {
			setLocalSpeed(value);
			onSpeedChange(value);
		},
		[onSpeedChange],
	);

	const cursorX = xScale(Math.min(syncedFrameIndex, effectiveMaxFrame));
	const disabled = totalFrames <= 1;

	const frameLabel = useMemo(() => {
		if (frameDisplayMode === "relative") {
			const pct =
				maxFrameCount > 0
					? Math.round((currentFrameIndex / maxFrameCount) * 100)
					: 0;
			return `${String(pct)}%`;
		}
		return `Frame ${String(currentFrameIndex + 1)}/${String(totalFrames)}`;
	}, [frameDisplayMode, currentFrameIndex, totalFrames, maxFrameCount]);

	return (
		<Box className={styles.container} style={{ opacity: disabled ? 0.4 : 1 }}>
			{/* Chart */}
			<Box className={styles.chartArea}>
				<svg
					ref={svgRef}
					width="100%"
					height={SVG_HEIGHT}
					viewBox={`0 0 100 ${String(SVG_HEIGHT)}`}
					preserveAspectRatio="none"
					style={{ display: "block" }}
					onMouseDown={disabled ? undefined : handleMouseDown}
				>
					{/* Axis baseline */}
					<line
						x1={LEFT_PAD}
						y1={SVG_HEIGHT - BOTTOM_PAD}
						x2={100 - RIGHT_PAD}
						y2={SVG_HEIGHT - BOTTOM_PAD}
						stroke="var(--mantine-color-gray-4)"
						strokeWidth={0.5}
					/>
					{/* Curves */}
					{columnCurves.map(({ index, algorithmName, curve, colour }) => {
						const points = curve
							.map(
								(p) =>
									`${String(xScale(p.frameIndex))},${String(yScale(p.pathCount))}`,
							)
							.join(" ");
						return (
							<polyline
								key={`${String(index)}-${algorithmName}`}
								points={points}
								fill="none"
								stroke={colour}
								strokeWidth={1.5}
							/>
						);
					})}
					{/* Cursor */}
					{!disabled && (
						<>
							<line
								x1={cursorX}
								y1={TOP_PAD}
								x2={cursorX}
								y2={SVG_HEIGHT - BOTTOM_PAD}
								stroke="var(--mantine-color-text)"
								strokeWidth={1}
								strokeOpacity={0.5}
								strokeDasharray="2,2"
							/>
							<circle
								cx={cursorX}
								cy={TOP_PAD}
								r={3}
								fill="var(--mantine-color-text)"
								opacity={0.6}
							/>
						</>
					)}
				</svg>
			</Box>

			{/* Controls row */}
			<Group gap="xs" className={styles.controls} justify="space-between">
				<Group gap="xs">
					<Tooltip label="Skip to Start">
						<ActionIcon
							size="sm"
							variant="subtle"
							onClick={() => {
								onSeek(0);
							}}
							disabled={disabled || currentFrameIndex === 0}
						>
							<IconPlayerSkipBack size={16} />
						</ActionIcon>
					</Tooltip>
					<Tooltip label="Previous Frame">
						<ActionIcon
							size="sm"
							variant="subtle"
							onClick={() => {
								handleFrameSeek("prev");
							}}
							disabled={disabled || currentFrameIndex === 0}
						>
							<IconChevronLeft size={16} />
						</ActionIcon>
					</Tooltip>
					<Button
						variant={localIsPlaying ? "filled" : "subtle"}
						onClick={handlePlayToggle}
						size="sm"
						disabled={disabled}
					>
						{localIsPlaying ? (
							<IconPlayerPause size={16} />
						) : (
							<IconPlayerPlay size={16} />
						)}
					</Button>
					<Tooltip label="Next Frame">
						<ActionIcon
							size="sm"
							variant="subtle"
							onClick={() => {
								handleFrameSeek("next");
							}}
							disabled={disabled || currentFrameIndex === totalFrames - 1}
						>
							<IconChevronRight size={16} />
						</ActionIcon>
					</Tooltip>
					<Tooltip label="Skip to End">
						<ActionIcon
							size="sm"
							variant="subtle"
							onClick={() => {
								onSeek(totalFrames - 1);
							}}
							disabled={disabled || currentFrameIndex === totalFrames - 1}
						>
							<IconPlayerSkipForward size={16} />
						</ActionIcon>
					</Tooltip>
				</Group>

				<Group gap="sm" align="center">
					{hasCurves && (
						<Group gap="sm" className={styles.legend}>
							{columnCurves.map(({ index, algorithmName, colour }) => (
								<Group
									key={`${String(index)}-${algorithmName}`}
									gap={4}
									wrap="nowrap"
								>
									<Box
										style={{
											width: 12,
											height: 3,
											backgroundColor: colour,
											borderRadius: 2,
											flexShrink: 0,
										}}
									/>
									<Text size="xs" c="dimmed">
										{algorithmName}
									</Text>
								</Group>
							))}
						</Group>
					)}

					<Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
						{disabled ? "—" : frameLabel}
					</Text>

					<Select
						size="xs"
						value={String(localSpeed)}
						onChange={(value) => {
							if (value !== null) {
								handleSpeedChange(parseFloat(value));
							}
						}}
						disabled={disabled}
						data={[
							{ value: "0.5", label: "0.5x" },
							{ value: "1", label: "1x" },
							{ value: "2", label: "2x" },
							{ value: "4", label: "4x" },
						]}
						className={styles.speedSelect}
						aria-label="Playback speed"
						searchable={false}
					/>
				</Group>
			</Group>
		</Box>
	);
}
