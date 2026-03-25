import { Stack, Text, SegmentedControl, Paper } from "@mantine/core";
import { useState } from "react";
import { useComparisonStore } from "../../state/comparison-store";
import type { ExpansionPath } from "graphwise/expansion";
import { PathCard } from "./PathCard";
import { MIComparisonChart } from "./MIComparisonChart";

type MIVariant = "jaccard" | "scale" | "skew";

const MI_VARIANTS = new Set<string>(["jaccard", "scale", "skew"]);

function isMIVariant(value: unknown): value is MIVariant {
	return typeof value === "string" && MI_VARIANTS.has(value);
}

export function RankingPanel(): React.ReactElement {
	const entries = useComparisonStore((state) => state.entries);
	const [miVariant, setMIVariant] = useState<MIVariant>("jaccard");

	// Extract paths from the most recent expansion result
	const paths: readonly ExpansionPath[] =
		entries.length > 0 && entries[entries.length - 1]?.stats
			? [] // TODO: Extract paths from expansion result
			: [];

	if (paths.length === 0) {
		return (
			<Paper p="md">
				<Text size="sm" c="dimmed">
					Run an expansion to see path rankings.
				</Text>
			</Paper>
		);
	}

	return (
		<Stack gap="md">
			<div>
				<Text size="sm" fw={500} mb="xs">
					MI Variant
				</Text>
				<SegmentedControl
					value={miVariant}
					onChange={(value: string): void => {
						if (isMIVariant(value)) {
							setMIVariant(value);
						}
					}}
					data={[
						{ label: "Jaccard", value: "jaccard" },
						{ label: "SCALE", value: "scale" },
						{ label: "SKEW", value: "skew" },
					]}
					size="xs"
					fullWidth
				/>
			</div>

			<MIComparisonChart paths={paths} variant={miVariant} />

			<div>
				<Text size="sm" fw={500} mb="xs">
					Ranked Paths
				</Text>
				<Stack gap="xs">
					{paths.map((path: ExpansionPath, idx: number) => (
						<PathCard key={idx} path={path} rank={idx + 1} />
					))}
				</Stack>
			</div>
		</Stack>
	);
}
