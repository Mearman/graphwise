import { Container, Tabs, Stack, Group, Button, Box } from "@mantine/core";
import { GraphCanvas } from "../components/graph/GraphCanvas";
import { PlaybackControls } from "../components/animation/PlaybackControls";
import { AnimationTimeline } from "../components/animation/AnimationTimeline";
import { ComparisonPanel } from "../components/comparison/ComparisonPanel";
import { RankingPanel } from "../components/ranking/RankingPanel";
import { CopyUrlButton } from "../components/shared/CopyUrlButton";
import { useTourStore } from "../state/tour-store";

export function ExplorePage(): React.ReactElement {
	const setMode = useTourStore((state) => state.setMode);

	return (
		<Stack gap={0} style={{ height: "100vh" }}>
			<Box
				p="md"
				style={{ borderBottom: "1px solid var(--mantine-color-gray-2)" }}
			>
				<Group justify="space-between">
					<Group>
						<Button
							variant="subtle"
							size="sm"
							onClick={() => {
								setMode("tour");
							}}
						>
							← Back to Tour
						</Button>
					</Group>
					<CopyUrlButton />
				</Group>
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
									totalFrames={0}
									currentFrameIndex={0}
									isPlaying={false}
									onPlay={(): void => {
										/* todo: wire to animation store */
									}}
									onPause={(): void => {
										/* todo: wire to animation store */
									}}
									onSeek={(): void => {
										/* todo: wire to animation store */
									}}
									speed={1}
									onSpeedChange={(): void => {
										/* todo: wire to animation store */
									}}
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
