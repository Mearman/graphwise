import { Container, Tabs, Stack, Box } from "@mantine/core";
import { GraphCanvas } from "../components/graph/GraphCanvas";
import { PlaybackControls } from "../components/animation/PlaybackControls";
import { AnimationTimeline } from "../components/animation/AnimationTimeline";
import { ComparisonPanel } from "../components/comparison/ComparisonPanel";
import { RankingPanel } from "../components/ranking/RankingPanel";
import { CopyUrlButton } from "../components/shared/CopyUrlButton";
import { useAnimationStore } from "../state/animation-store";

export function ExplorePage(): React.ReactElement {
	const frames = useAnimationStore((state) => state.frames);
	const currentFrameIndex = useAnimationStore(
		(state) => state.currentFrameIndex,
	);
	const isPlaying = useAnimationStore((state) => state.isPlaying);
	const speed = useAnimationStore((state) => state.speed);
	const togglePlay = useAnimationStore((state) => state.togglePlay);
	const setFrame = useAnimationStore((state) => state.setFrame);
	const setSpeed = useAnimationStore((state) => state.setSpeed);

	return (
		<Stack gap={0} style={{ height: "100vh" }}>
			<Box
				p="md"
				style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
			>
				<div style={{ display: "flex", justifyContent: "flex-end" }}>
					<CopyUrlButton />
				</div>
			</Box>

			<Container size="xl" style={{ flex: 1, overflow: "auto" }}>
				<Tabs defaultValue="builder" style={{ height: "100%" }}>
					<Tabs.List>
						<Tabs.Tab value="builder">Graph Builder</Tabs.Tab>
						<Tabs.Tab value="expansion">Expansion</Tabs.Tab>
						<Tabs.Tab value="ranking">Ranking</Tabs.Tab>
						<Tabs.Tab value="comparison">Comparison</Tabs.Tab>
					</Tabs.List>

					<Tabs.Panel value="builder" pt="md">
						<Stack gap="md">
							<div
								style={{
									height: 500,
									border: "1px solid #ddd",
									borderRadius: 8,
								}}
							>
								<GraphCanvas />
							</div>
						</Stack>
					</Tabs.Panel>

					<Tabs.Panel value="expansion" pt="md">
						<Stack gap="md">
							<PlaybackControls />
							<div style={{ height: 300 }}>
								<AnimationTimeline
									totalFrames={frames.length}
									currentFrameIndex={currentFrameIndex}
									isPlaying={isPlaying}
									onPlay={togglePlay}
									onPause={togglePlay}
									onSeek={setFrame}
									speed={speed}
									onSpeedChange={setSpeed}
								/>
							</div>
						</Stack>
					</Tabs.Panel>

					<Tabs.Panel value="ranking" pt="md">
						<RankingPanel />
					</Tabs.Panel>

					<Tabs.Panel value="comparison" pt="md">
						<ComparisonPanel />
					</Tabs.Panel>
				</Tabs>
			</Container>
		</Stack>
	);
}
