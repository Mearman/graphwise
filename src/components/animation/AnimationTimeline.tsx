import { useCallback, useMemo, useState, useEffect } from "react";
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
import * as styles from "./AnimationTimeline.css";

export interface AnimationTimelineProps {
	/** Total number of frames in the animation */
	readonly totalFrames: number;
	/** Current frame index (0-based) */
	readonly currentFrameIndex: number;
	/** Whether animation is currently playing */
	readonly isPlaying: boolean;
	/** Callback to start playback */
	readonly onPlay: () => void;
	/** Callback to pause playback */
	readonly onPause: () => void;
	/** Callback to seek to a specific frame */
	readonly onSeek: (frame: number) => void;
	/** Playback speed multiplier */
	readonly speed: number;
	/** Callback when speed changes */
	readonly onSpeedChange: (speed: number) => void;
	/** Maximum frame count across all algorithms (for relative mode) */
	readonly maxFrameCount: number;
	/** Frame display mode: absolute or relative */
	readonly frameDisplayMode: "absolute" | "relative";
}

export function AnimationTimeline({
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
}: AnimationTimelineProps): React.ReactElement {
	// Calculate progress percentage
	const progressPercentage = useMemo(() => {
		if (totalFrames <= 1) return 0;
		return (currentFrameIndex / (totalFrames - 1)) * 100;
	}, [currentFrameIndex, totalFrames]);

	const [localIsPlaying, setLocalIsPlaying] = useState(isPlaying);
	const [progress, setProgress] = useState(progressPercentage);
	const [localSpeed, setLocalSpeed] = useState(speed);

	// Sync local state with props
	useEffect(() => {
		setProgress(progressPercentage);
	}, [progressPercentage]);

	useEffect(() => {
		setLocalIsPlaying(isPlaying);
	}, [isPlaying]);

	useEffect(() => {
		setLocalSpeed(speed);
	}, [speed]);

	const handlePlayToggle = useCallback(() => {
		if (localIsPlaying) {
			onPause();
		} else {
			onPlay();
		}
		setLocalIsPlaying(!localIsPlaying);
	}, [localIsPlaying, onPlay, onPause]);

	const handleSeek = useCallback(
		(event: React.MouseEvent<HTMLDivElement>) => {
			const rect = event.currentTarget.getBoundingClientRect();
			const x = event.clientX - rect.left;
			const percentage = x / rect.width;
			const targetFrame = Math.round(percentage * (totalFrames - 1));
			onSeek(Math.max(0, Math.min(targetFrame, totalFrames - 1)));
		},
		[totalFrames, onSeek],
	);

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

	const formatFrame = useCallback(
		(frame: number): string => {
			if (frameDisplayMode === "relative") {
				return `Frame ${String(frame + 1)}/${String(maxFrameCount)}`;
			}
			return `Frame ${String(frame + 1)}/${String(totalFrames)}`;
		},
		[totalFrames, maxFrameCount, frameDisplayMode],
	);

	const disabled = totalFrames <= 1;

	return (
		<Box className={styles.container} style={{ opacity: disabled ? 0.4 : 1 }}>
			{/* Controls group: left side */}
			<Group gap="xs" className={styles.controls}>
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

			{/* Right section: progress bar, frame label, and speed dropdown */}
			<Group
				gap="xs"
				className={styles.rightSection}
				align="center"
				style={{ flex: 1, minWidth: 0 }}
			>
				<div
					className={styles.progressTrack}
					onClick={disabled ? undefined : handleSeek}
					style={{
						cursor: disabled ? "default" : "pointer",
						flex: 1,
						minWidth: 0,
					}}
				>
					<div
						className={styles.progressFill}
						style={{ width: `${String(progress)}%` }}
					/>
					{!disabled && (
						<div
							className={styles.progressIndicator}
							style={{ left: `${String(progress)}%` }}
							onMouseDown={(e) => {
								e.preventDefault();
								const track = e.currentTarget.parentElement;
								if (track === null) return;

								const handleMouseMove = (moveEvent: MouseEvent): void => {
									const rect = track.getBoundingClientRect();
									const x = moveEvent.clientX - rect.left;
									const percentage = Math.max(
										0,
										Math.min(100, (x / rect.width) * 100),
									);
									const targetFrame = Math.round(
										(percentage / 100) * (totalFrames - 1),
									);
									onSeek(targetFrame);
								};

								const handleMouseUp = (): void => {
									document.removeEventListener("mousemove", handleMouseMove);
									document.removeEventListener("mouseup", handleMouseUp);
								};

								document.addEventListener("mousemove", handleMouseMove);
								document.addEventListener("mouseup", handleMouseUp);
							}}
						/>
					)}
				</div>
				<Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
					{disabled ? "—" : formatFrame(currentFrameIndex)}
				</Text>
				<Select
					size="xs"
					value={String(localSpeed)}
					onChange={(value) => {
						if (value !== null) {
							const speed = parseFloat(value);
							handleSpeedChange(speed);
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
		</Box>
	);
}
