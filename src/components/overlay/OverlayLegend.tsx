import { type ReactNode } from "react";
import { Group, Badge, Box } from "@mantine/core";
import { useColumnStore } from "../../state/column-store";
import { getAlgorithm } from "../../engine/algorithm-registry";

const COLOUR_PALETTE = {
	novel: ["#14b8a6", "#06b6d4", "#0891b2"],
	baseline: ["#6b7280", "#9ca3af", "#d1d5db"],
};

function getAlgorithmColour(index: number, isNovel: boolean): string {
	const palette = isNovel ? COLOUR_PALETTE.novel : COLOUR_PALETTE.baseline;
	return palette[index % palette.length] ?? "#64748b";
}

export function OverlayLegend(): ReactNode {
	const columns = useColumnStore((state) => state.columns);

	const activeColumns = columns.filter(
		(col) => col.expansionAlgorithm !== null,
	);

	if (activeColumns.length === 0) {
		return null;
	}

	return (
		<Box
			style={{
				display: "flex",
				gap: 8,
				padding: "8px 0",
				flexWrap: "wrap",
			}}
		>
			{activeColumns.map((column, index) => {
				if (column.expansionAlgorithm === null) return null;

				const algoInfo = getAlgorithm(column.expansionAlgorithm);
				const isNovel = algoInfo?.category === "novel";
				const colour = getAlgorithmColour(index, isNovel);

				return (
					<Group key={column.id} gap={6}>
						<Badge
							size="xs"
							style={{ backgroundColor: colour }}
							variant="filled"
						>
							{index + 1}
						</Badge>
						<Box component="span" size="xs">
							{algoInfo?.label ?? column.expansionAlgorithm}
							{isNovel ? (
								<Badge size="xs" color="teal" variant="light" ml={6}>
									Novel
								</Badge>
							) : (
								<Badge size="xs" color="gray" variant="light" ml={6}>
									Baseline
								</Badge>
							)}
						</Box>
					</Group>
				);
			})}
		</Box>
	);
}
