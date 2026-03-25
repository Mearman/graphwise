import { type ReactNode } from "react";
import { Group, Paper, Text, Stack } from "@mantine/core";
import { IconRoute, IconTrendingUp } from "@tabler/icons-react";
import type { PipelineColumn } from "../../state/column-store";

interface ColumnMetricsProps {
	readonly column: PipelineColumn;
}

interface MetricCardProps {
	readonly icon: ReactNode;
	readonly label: string;
	readonly value: string | number;
}

function MetricCard({ icon, label, value }: MetricCardProps): ReactNode {
	return (
		<Paper p="xs" withBorder>
			<Group gap="xs" wrap="nowrap">
				{icon}
				<Stack gap={0}>
					<Text size="xs" c="dimmed">
						{label}
					</Text>
					<Text size="sm" fw={500}>
						{value}
					</Text>
				</Stack>
			</Group>
		</Paper>
	);
}

export function ColumnMetrics({ column }: ColumnMetricsProps): ReactNode {
	const stats = column.expansionResult?.stats;
	const rankingStats = column.rankingResult?.stats;

	const pathsFound = stats?.pathsFound ?? 0;
	const meanSalience = rankingStats?.meanSalience;

	return (
		<Group grow>
			<MetricCard
				icon={<IconRoute size={16} />}
				label="Paths"
				value={pathsFound}
			/>
			<MetricCard
				icon={<IconTrendingUp size={16} />}
				label="Mean Salience"
				value={meanSalience !== undefined ? meanSalience.toFixed(3) : "-"}
			/>
		</Group>
	);
}
