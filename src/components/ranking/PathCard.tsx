import { Card, Group, Badge, Stack, Text } from "@mantine/core";
import type { ExpansionPath } from "graphwise/expansion";

interface PathCardProps {
	readonly path: ExpansionPath;
	readonly rank: number;
}

export function PathCard({ path, rank }: PathCardProps): React.ReactElement {
	const pathString = path.nodes.slice(0, 5).join(" → ");
	const isTruncated = path.nodes.length > 5;

	return (
		<Card p="sm" radius="sm" withBorder>
			<Stack gap="xs">
				<Group justify="space-between">
					<Badge size="lg" variant="filled">
						#{rank}
					</Badge>
					<Text size="xs" c="dimmed">
						Length: {path.nodes.length}
					</Text>
				</Group>
				<Text size="sm" style={{ fontFamily: "monospace" }}>
					{pathString}
					{isTruncated ? " …" : ""}
				</Text>
			</Stack>
		</Card>
	);
}
