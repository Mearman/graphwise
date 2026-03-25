import { type ReactNode, useCallback } from "react";
import {
	Group,
	Text,
	ActionIcon,
	Select,
	Badge,
	Tooltip,
	Stack,
} from "@mantine/core";
import { IconX } from "@tabler/icons-react";
import {
	expansionAlgorithmNames,
	getAlgorithm,
	miVariantNames,
	rankingAlgorithmNames,
	type ExpansionAlgorithmName,
	type RankingAlgorithmName,
} from "../../engine/algorithm-registry";
import type { MIVariantName } from "graphwise/ranking/mi";
import type { PipelineColumn } from "../../state/column-store";
import { useColumnStore } from "../../state/column-store";

interface ColumnHeaderProps {
	readonly column: PipelineColumn;
}

function safeCastExpansionAlgorithm(
	value: string | null,
	validNames: readonly ExpansionAlgorithmName[],
): ExpansionAlgorithmName | null {
	if (value === null) return null;
	for (const name of validNames) {
		if (name === value) return name;
	}
	return null;
}

function safeCastMIVariant(
	value: string | null,
	validNames: readonly MIVariantName[],
): MIVariantName | null {
	if (value === null) return null;
	for (const name of validNames) {
		if (name === value) return name;
	}
	return null;
}

function safeCastRankingAlgorithm(
	value: string | null,
	validNames: readonly RankingAlgorithmName[],
): RankingAlgorithmName | null {
	if (value === null) return null;
	for (const name of validNames) {
		if (name === value) return name;
	}
	return null;
}

export function ColumnHeader({ column }: ColumnHeaderProps): ReactNode {
	const updateColumn = useColumnStore((state) => state.updateColumn);
	const removeColumn = useColumnStore((state) => state.removeColumn);
	const columns = useColumnStore((state) => state.columns);

	const algorithmInfo =
		column.expansionAlgorithm !== null
			? getAlgorithm(column.expansionAlgorithm)
			: undefined;

	const canRemove = columns.length > 1;

	const validExpansionAlgorithms = expansionAlgorithmNames();
	const validMIVariants = miVariantNames();
	const validRankingAlgorithms = rankingAlgorithmNames();

	const expansionOptions = validExpansionAlgorithms.map((name) => {
		const info = getAlgorithm(name);
		return {
			value: name,
			label: info?.label ?? name,
		};
	});

	const miOptions = validMIVariants.map((name) => ({
		value: name,
		label: name,
	}));

	const rankingOptions = validRankingAlgorithms.map((name) => ({
		value: name,
		label: name,
	}));

	const handleExpansionChange = useCallback(
		(value: string | null) => {
			const alg = safeCastExpansionAlgorithm(value, validExpansionAlgorithms);
			updateColumn(column.id, { expansionAlgorithm: alg });
		},
		[column.id, updateColumn, validExpansionAlgorithms],
	);

	const handleMIChange = useCallback(
		(value: string | null) => {
			const variant = safeCastMIVariant(value, validMIVariants);
			if (variant !== null) {
				updateColumn(column.id, { miVariant: variant });
			}
		},
		[column.id, updateColumn, validMIVariants],
	);

	const handleRankingChange = useCallback(
		(value: string | null) => {
			const algo = safeCastRankingAlgorithm(value, validRankingAlgorithms);
			if (algo !== null) {
				updateColumn(column.id, { rankingAlgorithm: algo });
			}
		},
		[column.id, updateColumn, validRankingAlgorithms],
	);

	const handleRemove = useCallback(() => {
		removeColumn(column.id);
	}, [column.id, removeColumn]);

	return (
		<Stack gap="xs">
			<Group justify="space-between" wrap="nowrap">
				<Group gap="xs" wrap="nowrap">
					{algorithmInfo !== undefined ? (
						<Badge
							size="sm"
							color={algorithmInfo.category === "novel" ? "teal" : "gray"}
							variant="filled"
						>
							{algorithmInfo.label}
						</Badge>
					) : (
						<Badge size="sm" color="gray" variant="light">
							No algorithm
						</Badge>
					)}
					{column.isRunning ? (
						<Text size="xs" c="dimmed">
							Running...
						</Text>
					) : null}
				</Group>
				<Tooltip
					label={canRemove ? "Remove column" : "Cannot remove last column"}
				>
					<ActionIcon
						size="xs"
						variant="subtle"
						color="gray"
						disabled={!canRemove}
						onClick={handleRemove}
					>
						<IconX size={14} />
					</ActionIcon>
				</Tooltip>
			</Group>

			<Select
				size="xs"
				placeholder="Select expansion algorithm"
				data={expansionOptions}
				value={column.expansionAlgorithm}
				onChange={handleExpansionChange}
				clearable
			/>

			<Group grow>
				<Select
					size="xs"
					placeholder="MI variant"
					data={miOptions}
					value={column.miVariant}
					onChange={handleMIChange}
				/>
				<Select
					size="xs"
					placeholder="Ranking"
					data={rankingOptions}
					value={column.rankingAlgorithm}
					onChange={handleRankingChange}
				/>
			</Group>
		</Stack>
	);
}
