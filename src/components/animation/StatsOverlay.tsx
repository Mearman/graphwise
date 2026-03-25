import { Box, Paper, Stack, Text } from "@mantine/core";
import { useAnimationStore } from "../../state/animation-store";

export function StatsOverlay(): React.ReactElement {
	const currentFrameIndex = useAnimationStore(
		(state) => state.currentFrameIndex,
	);
	const frames = useAnimationStore((state) => state.frames);

	const currentFrame = frames[currentFrameIndex] ?? null;

	if (!currentFrame) {
		return <Box />;
	}

	return (
		<Paper
			p="xs"
			radius="sm"
			style={{
				position: "absolute",
				top: 16,
				right: 16,
				backgroundColor: "rgba(0, 0, 0, 0.7)",
				color: "white",
				zIndex: 100,
				minWidth: 180,
			}}
		>
			<Stack gap={4}>
				<Text size="xs" fw={500}>
					Frame {currentFrameIndex + 1}/{frames.length}
				</Text>
				<Text size="xs">Iteration: {currentFrame.iteration}</Text>
				<Text size="xs">Frontier Size: {currentFrame.activeFrontier}</Text>
				<Text size="xs">Nodes Visited: {currentFrame.visitedNodes.size}</Text>
				<Text size="xs">Edges Traversed: {currentFrame.edgesTraversed}</Text>
				<Text size="xs">
					Paths Found: {currentFrame.discoveredPaths.length}
				</Text>
			</Stack>
		</Paper>
	);
}
