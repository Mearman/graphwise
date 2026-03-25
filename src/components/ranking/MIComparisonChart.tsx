import { Text, Stack } from "@mantine/core";
import type { ExpansionPath } from "graphwise/expansion";

interface MIComparisonChartProps {
	readonly paths: readonly ExpansionPath[];
	readonly variant: "jaccard" | "scale" | "skew";
}

export function MIComparisonChart({
	paths,
	variant,
}: MIComparisonChartProps): React.ReactElement {
	if (paths.length === 0) {
		return (
			<Text size="sm" c="dimmed">
				No paths to compare.
			</Text>
		);
	}

	return (
		<Stack gap="sm">
			<Text size="xs" c="dimmed">
				Comparing MI variant: <strong>{variant.toUpperCase()}</strong>
			</Text>
			<div style={{ height: 200, backgroundColor: "#f8f9fa", borderRadius: 8 }}>
				<Text
					size="xs"
					c="dimmed"
					style={{ padding: "20px", textAlign: "center" }}
				>
					D3 MI comparison chart (placeholder)
				</Text>
			</div>
		</Stack>
	);
}
