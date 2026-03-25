import { Text, Stack } from "@mantine/core";

export function MetricsChart(): React.ReactElement {
	return (
		<Stack gap="md">
			<Text size="sm" fw={500}>
				Metrics Comparison Chart
			</Text>
			<div
				style={{
					height: 300,
					backgroundColor: "#f8f9fa",
					borderRadius: "8px",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					color: "#999",
				}}
			>
				D3 grouped bar chart (placeholder)
			</div>
		</Stack>
	);
}
