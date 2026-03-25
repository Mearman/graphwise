import { type ReactNode } from "react";
import { Stack, Text, Group } from "@mantine/core";

export interface FrontierGaugeProps {
	/** Size of the source frontier (index 0) */
	readonly sourceSize: number;
	/** Size of the target frontier (index 1) */
	readonly targetSize: number;
	/** Which frontier is currently active (0 = source, 1 = target) */
	readonly activeFrontier: 0 | 1;
}

export function FrontierGauge({
	sourceSize,
	targetSize,
	activeFrontier,
}: FrontierGaugeProps): ReactNode {
	const total = sourceSize + targetSize;
	const sourcePercent = total > 0 ? (sourceSize / total) * 100 : 50;
	const targetPercent = total > 0 ? (targetSize / total) * 100 : 50;

	return (
		<Stack gap={4}>
			<Text size="xs" fw={500}>
				Frontier Sizes
			</Text>
			<Group gap="xs" wrap="nowrap">
				<Stack gap={2} style={{ flex: 1 }}>
					<Group justify="space-between">
						<Text size="xs" c={activeFrontier === 0 ? "blue" : "dimmed"}>
							Source
						</Text>
						<Text size="xs" ff="monospace">
							{sourceSize}
						</Text>
					</Group>
					<div
						style={{
							height: 8,
							backgroundColor:
								activeFrontier === 0
									? "var(--mantine-color-blue-6)"
									: "var(--mantine-color-blue-3)",
							borderRadius: 4,
							width: `${String(sourcePercent)}%`,
							transition: "width 0.15s ease",
						}}
					/>
				</Stack>
				<Stack gap={2} style={{ flex: 1 }}>
					<Group justify="space-between">
						<Text size="xs" c={activeFrontier === 1 ? "orange" : "dimmed"}>
							Target
						</Text>
						<Text size="xs" ff="monospace">
							{targetSize}
						</Text>
					</Group>
					<div
						style={{
							height: 8,
							backgroundColor:
								activeFrontier === 1
									? "var(--mantine-color-orange-6)"
									: "var(--mantine-color-orange-3)",
							borderRadius: 4,
							width: `${String(targetPercent)}%`,
							transition: "width 0.15s ease",
						}}
					/>
				</Stack>
			</Group>
		</Stack>
	);
}
