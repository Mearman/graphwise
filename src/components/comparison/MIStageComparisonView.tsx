import { type ReactNode } from "react";
import {
	Badge,
	Card,
	Group,
	Paper,
	SimpleGrid,
	Stack,
	Text,
} from "@mantine/core";
import { getMIVariant } from "../../engine/algorithm-registry";
import type { MIVariantComparisonEntry } from "../../state/comparison-store";

export interface MIStageComparisonViewProps {
	readonly entries: readonly MIVariantComparisonEntry[];
	readonly totalDurationMs: number;
}

export function MIStageComparisonView({
	entries,
	totalDurationMs,
}: MIStageComparisonViewProps): ReactNode {
	if (entries.length === 0) {
		return (
			<Paper p="xl" h="100%" style={{ display: "grid", placeItems: "center" }}>
				<Text size="sm" c="dimmed" ta="center">
					No MI comparison results yet. Select MI variants and run comparison.
				</Text>
			</Paper>
		);
	}

	const sortedEntries = [...entries].sort(
		(a, b) => b.meanSalience - a.meanSalience,
	);
	const bestEntry = sortedEntries[0];
	const fastestEntry = [...entries].sort(
		(a, b) => a.durationMs - b.durationMs,
	)[0];
	const totalPaths = entries.reduce((sum, entry) => sum + entry.pathsCount, 0);

	return (
		<Stack gap="md" p="md" h="100%" style={{ overflow: "auto" }}>
			<Group justify="space-between">
				<Stack gap={2}>
					<Text size="sm" fw={700}>
						MI Stage Comparison
					</Text>
					<Text size="xs" c="dimmed">
						Metrics-first summary for {entries.length} variants
					</Text>
				</Stack>
				<Badge variant="light" color="grape">
					Total time: {totalDurationMs.toFixed(1)}ms
				</Badge>
			</Group>

			<SimpleGrid cols={{ base: 1, sm: 3 }}>
				<MetricCard
					title="Top mean salience"
					value={(bestEntry?.meanSalience ?? 0).toFixed(4)}
					detail={bestEntry ? getVariantLabel(bestEntry.variant) : "—"}
				/>
				<MetricCard
					title="Fastest variant"
					value={`${(fastestEntry?.durationMs ?? 0).toFixed(1)}ms`}
					detail={fastestEntry ? getVariantLabel(fastestEntry.variant) : "—"}
				/>
				<MetricCard
					title="Total discovered paths"
					value={totalPaths.toLocaleString()}
					detail="Across all MI variants"
				/>
			</SimpleGrid>

			<Stack gap="xs">
				{sortedEntries.map((entry, index) => (
					<Card key={entry.variant} withBorder padding="sm">
						<Group justify="space-between" wrap="nowrap">
							<Group gap="xs">
								<Badge
									size="xs"
									color={index === 0 ? "yellow" : "gray"}
									variant={index === 0 ? "filled" : "light"}
								>
									#{index + 1}
								</Badge>
								<Text size="sm" fw={600}>
									{getVariantLabel(entry.variant)}
								</Text>
							</Group>
							<Group gap="md">
								<MetricInline
									label="Mean salience"
									value={entry.meanSalience.toFixed(4)}
								/>
								<MetricInline
									label="Paths"
									value={entry.pathsCount.toLocaleString()}
								/>
								<MetricInline
									label="Time"
									value={`${entry.durationMs.toFixed(1)}ms`}
								/>
							</Group>
						</Group>
					</Card>
				))}
			</Stack>
		</Stack>
	);
}

interface MetricCardProps {
	readonly title: string;
	readonly value: string;
	readonly detail: string;
}

function MetricCard({ title, value, detail }: MetricCardProps): ReactNode {
	return (
		<Card withBorder padding="md">
			<Stack gap={2}>
				<Text size="xs" c="dimmed">
					{title}
				</Text>
				<Text size="lg" fw={700} ff="monospace">
					{value}
				</Text>
				<Text size="xs" c="dimmed">
					{detail}
				</Text>
			</Stack>
		</Card>
	);
}

interface MetricInlineProps {
	readonly label: string;
	readonly value: string;
}

function MetricInline({ label, value }: MetricInlineProps): ReactNode {
	return (
		<Stack gap={0} align="flex-end">
			<Text size="xs" c="dimmed">
				{label}
			</Text>
			<Text size="sm" ff="monospace" fw={600}>
				{value}
			</Text>
		</Stack>
	);
}

function getVariantLabel(name: MIVariantComparisonEntry["variant"]): string {
	return getMIVariant(name)?.label ?? name;
}
