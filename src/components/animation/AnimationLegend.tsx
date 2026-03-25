import { Box, Paper, Stack, Text, Group } from "@mantine/core";

interface LegendItem {
	readonly label: string;
	readonly colour: string;
	readonly description: string;
}

const LEGEND_ITEMS: readonly LegendItem[] = [
	{
		label: "Visited Nodes",
		colour: "#4CAF50",
		description: "Explored in expansion",
	},
	{
		label: "Frontier Nodes",
		colour: "#FF6B6B",
		description: "Waiting to expand",
	},
	{
		label: "Traversed Edges",
		colour: "#2196F3",
		description: "Followed during search",
	},
	{
		label: "Path Discovery",
		colour: "#FFD700",
		description: "Gold pins on timeline",
	},
	{
		label: "Phase Transition",
		colour: "#888888",
		description: "Dashed dividers",
	},
	{
		label: "Termination",
		colour: "#F03E3E",
		description: "Final frame marker",
	},
];

export function AnimationLegend(): React.ReactElement {
	return (
		<Paper
			p="sm"
			radius="sm"
			style={{
				position: "absolute",
				bottom: 16,
				left: 16,
				backgroundColor: "rgba(0, 0, 0, 0.7)",
				color: "white",
				zIndex: 100,
				maxWidth: 220,
			}}
		>
			<Stack gap={6}>
				<Text size="xs" fw={600}>
					Legend
				</Text>
				{LEGEND_ITEMS.map((item) => (
					<Group key={item.label} gap={8}>
						<Box
							style={{
								width: "12px",
								height: "12px",
								backgroundColor: item.colour,
								borderRadius: "2px",
								flexShrink: 0,
							}}
						/>
						<Stack gap={0}>
							<Text size="xs" fw={500}>
								{item.label}
							</Text>
							<Text size="xs" c="dimmed">
								{item.description}
							</Text>
						</Stack>
					</Group>
				))}
			</Stack>
		</Paper>
	);
}
