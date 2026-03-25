import { Button, Group, Slider, Stack, Text } from "@mantine/core";
import {
	IconPlayerPause,
	IconPlayerPlay,
	IconPlayerSkipBack,
	IconPlayerSkipForward,
} from "@tabler/icons-react";
import { useAnimation } from "../../hooks/use-animation";
import { container } from "./PlaybackControls.css";

export function PlaybackControls(): React.ReactElement {
	const { isPlaying, speed, toggle, step, setSpeed } = useAnimation();

	return (
		<Stack gap="md" className={container}>
			<Group justify="center" gap="xs">
				<Button
					variant="default"
					size="sm"
					onClick={() => {
						step("backward");
					}}
					title="Step backward (← arrow)"
				>
					<IconPlayerSkipBack size={16} />
				</Button>

				<Button
					size="sm"
					onClick={toggle}
					title={isPlaying ? "Pause (Space)" : "Play (Space)"}
				>
					{isPlaying ? (
						<IconPlayerPause size={16} />
					) : (
						<IconPlayerPlay size={16} />
					)}
				</Button>

				<Button
					variant="default"
					size="sm"
					onClick={() => {
						step("forward");
					}}
					title="Step forward (→ arrow)"
				>
					<IconPlayerSkipForward size={16} />
				</Button>
			</Group>

			<Stack gap="xs">
				<Group justify="space-between" gap="xs">
					<Text size="sm" fw={500}>
						Speed
					</Text>
					<Text size="sm" c="dimmed">
						{speed.toFixed(1)}×
					</Text>
				</Group>
				<Slider
					min={0.5}
					max={2}
					step={0.1}
					value={speed}
					onChange={setSpeed}
					marks={[
						{ value: 0.5, label: "0.5×" },
						{ value: 1, label: "1×" },
						{ value: 2, label: "2×" },
					]}
					title="Playback speed (0.5× to 2×)"
				/>
			</Stack>
		</Stack>
	);
}
