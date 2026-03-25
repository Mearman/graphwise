import { type ReactNode } from "react";
import { Table, Group, Text, Badge, Stack, Box, Button } from "@mantine/core";
import { IconPlayerPlay } from "@tabler/icons-react";
import { getAlgorithm } from "../../engine/algorithm-registry";
import type {
	ComparisonEntry,
	ComparisonStage,
	MIVariantComparisonEntry,
} from "../../state/comparison-store";
import { useComparisonStore } from "../../state/comparison-store";
import type { ExpansionAlgorithmName } from "../../engine/algorithm-registry";

export interface ComparisonTableProps {
	readonly entries: readonly ComparisonEntry[];
	readonly miEntries?: readonly MIVariantComparisonEntry[];
	readonly comparisonStage?: ComparisonStage;
	readonly totalDurationMs: number;
	readonly onReplay?: (algorithmName: ExpansionAlgorithmName) => void;
}

export function ComparisonTable({
	entries,
	miEntries,
	comparisonStage = "expansion",
	totalDurationMs,
	onReplay,
}: ComparisonTableProps): ReactNode {
	if (comparisonStage === "mi") {
		const rows = miEntries ?? [];
		if (rows.length === 0) {
			return (
				<Text size="sm" c="dimmed" ta="center" py="xl">
					No MI comparison results yet. Select MI variants and run comparison.
				</Text>
			);
		}

		const sorted = [...rows].sort((a, b) => b.meanSalience - a.meanSalience);
		return (
			<Stack gap="xs">
				<Group justify="space-between">
					<Text size="sm" fw={500}>
						MI Results ({sorted.length} variants)
					</Text>
					<Text size="xs" c="dimmed">
						Total time: {totalDurationMs.toFixed(1)}ms
					</Text>
				</Group>
				<Box style={{ overflowX: "auto" }}>
					<Table striped highlightOnHover horizontalSpacing="sm">
						<Table.Thead>
							<Table.Tr>
								<Table.Th>MI Variant</Table.Th>
								<Table.Th>Paths</Table.Th>
								<Table.Th>Mean salience</Table.Th>
								<Table.Th>Time (ms)</Table.Th>
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>
							{sorted.map((entry) => (
								<Table.Tr key={entry.variant}>
									<Table.Td>
										<Text size="sm" fw={500}>
											{entry.variant}
										</Text>
									</Table.Td>
									<Table.Td>
										<StatValue value={entry.pathsCount} />
									</Table.Td>
									<Table.Td>
										<Text size="sm" ff="monospace">
											{entry.meanSalience.toFixed(4)}
										</Text>
									</Table.Td>
									<Table.Td>
										<Text size="sm" ff="monospace">
											{entry.durationMs.toFixed(1)}
										</Text>
									</Table.Td>
								</Table.Tr>
							))}
						</Table.Tbody>
					</Table>
				</Box>
			</Stack>
		);
	}

	if (entries.length === 0) {
		return (
			<Text size="sm" c="dimmed" ta="center" py="xl">
				No comparison results yet. Select algorithms and run comparison.
			</Text>
		);
	}

	// Sort by total nodes visited (descending)
	const sortedEntries = [...entries].sort((a, b) => {
		const aNodes = a.stats.nodesVisited;
		const bNodes = b.stats.nodesVisited;
		return bNodes - aNodes;
	});

	return (
		<Stack gap="xs">
			<Group justify="space-between">
				<Text size="sm" fw={500}>
					Results ({entries.length} algorithms)
				</Text>
				<Text size="xs" c="dimmed">
					Total time: {totalDurationMs.toFixed(1)}ms
				</Text>
			</Group>

			<Box style={{ overflowX: "auto" }}>
				<Table striped highlightOnHover horizontalSpacing="sm">
					<Table.Thead>
						<Table.Tr>
							<Table.Th>Algorithm</Table.Th>
							<Table.Th>Nodes</Table.Th>
							<Table.Th>Edges</Table.Th>
							<Table.Th>Paths</Table.Th>
							<Table.Th>Iterations</Table.Th>
							<Table.Th>Time (ms)</Table.Th>
							{onReplay ? <Table.Th>Action</Table.Th> : null}
						</Table.Tr>
					</Table.Thead>
					<Table.Tbody>
						{sortedEntries.map((entry) => (
							<ComparisonRow
								key={entry.algorithmName}
								entry={entry}
								{...(onReplay ? { onReplay } : {})}
							/>
						))}
					</Table.Tbody>
				</Table>
			</Box>
		</Stack>
	);
}

interface ComparisonRowProps {
	readonly entry: ComparisonEntry;
	readonly onReplay?: (algorithmName: ExpansionAlgorithmName) => void;
}

function ComparisonRow({ entry, onReplay }: ComparisonRowProps): ReactNode {
	const highlightedAlgorithm = useComparisonStore(
		(state) => state.highlightedAlgorithm,
	);
	const setHighlightedAlgorithm = useComparisonStore(
		(state) => state.setHighlightedAlgorithm,
	);

	const info = getAlgorithm(entry.algorithmName);
	const isHighlighted = highlightedAlgorithm === entry.algorithmName;
	const stats = entry.stats;

	return (
		<Table.Tr
			style={{
				backgroundColor: isHighlighted
					? "var(--mantine-color-blue-0)"
					: undefined,
				cursor: "pointer",
			}}
			onMouseEnter={() => {
				setHighlightedAlgorithm(entry.algorithmName);
			}}
			onMouseLeave={() => {
				setHighlightedAlgorithm(null);
			}}
		>
			<Table.Td>
				<Group gap="xs" wrap="nowrap">
					<Text size="sm" fw={500}>
						{info?.label ?? entry.algorithmName}
					</Text>
					{info?.category === "novel" ? (
						<Badge size="xs" variant="light" color="blue">
							Novel
						</Badge>
					) : null}
				</Group>
			</Table.Td>
			<Table.Td>
				<StatValue value={stats.nodesVisited} />
			</Table.Td>
			<Table.Td>
				<StatValue value={stats.edgesTraversed} />
			</Table.Td>
			<Table.Td>
				<StatValue value={stats.pathsFound} />
			</Table.Td>
			<Table.Td>
				<StatValue value={stats.iterations} />
			</Table.Td>
			<Table.Td>
				<Text size="sm" ff="monospace">
					{stats.durationMs.toFixed(1)}
				</Text>
			</Table.Td>
			{onReplay ? (
				<Table.Td
					onClick={(e) => {
						e.stopPropagation();
					}}
				>
					<Button
						size="xs"
						variant="subtle"
						title={`Replay ${info?.label ?? entry.algorithmName} animation`}
						onClick={() => {
							onReplay(entry.algorithmName);
						}}
					>
						<IconPlayerPlay size={14} />
					</Button>
				</Table.Td>
			) : null}
		</Table.Tr>
	);
}

interface StatValueProps {
	readonly value: number;
}

function StatValue({ value }: StatValueProps): ReactNode {
	return (
		<Text size="sm" ff="monospace">
			{value.toLocaleString()}
		</Text>
	);
}
