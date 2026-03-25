import { type ReactNode } from "react";
import { Table, Group, Text, Badge, Stack, Box, Button } from "@mantine/core";
import { IconPlayerPlay } from "@tabler/icons-react";
import {
	getAlgorithm,
	getMIVariant,
	getRankingAlgorithm,
	getSeedSelectionStrategy,
	getSubgraphExtractionStrategy,
} from "../../engine/algorithm-registry";
import type {
	ComparisonEntry,
	ComparisonStage,
	MIVariantComparisonEntry,
	RankingAlgorithmComparisonEntry,
	SeedSelectionComparisonEntry,
	SubgraphExtractionComparisonEntry,
} from "../../state/comparison-store";
import { useComparisonStore } from "../../state/comparison-store";
import type { ExpansionAlgorithmName } from "../../engine/algorithm-registry";

export interface ComparisonTableProps {
	readonly entries: readonly ComparisonEntry[];
	readonly seedEntries?: readonly SeedSelectionComparisonEntry[];
	readonly miEntries?: readonly MIVariantComparisonEntry[];
	readonly rankingEntries?: readonly RankingAlgorithmComparisonEntry[];
	readonly subgraphEntries?: readonly SubgraphExtractionComparisonEntry[];
	readonly comparisonStage?: ComparisonStage;
	readonly totalDurationMs: number;
	readonly onReplay?: (algorithmName: ExpansionAlgorithmName) => void;
}

export function ComparisonTable({
	entries,
	seedEntries,
	miEntries,
	rankingEntries,
	subgraphEntries,
	comparisonStage = "expansion",
	totalDurationMs,
	onReplay,
}: ComparisonTableProps): ReactNode {
	if (comparisonStage === "subgraph-extraction") {
		const rows = subgraphEntries ?? [];
		if (rows.length === 0) {
			return (
				<Text size="sm" c="dimmed" ta="center" py="xl">
					No subgraph extraction results yet. Select strategies and run
					comparison.
				</Text>
			);
		}

		const sorted = [...rows].sort(
			(a, b) =>
				b.meanSalience - a.meanSalience ||
				b.retentionRatio - a.retentionRatio ||
				a.strategyName.localeCompare(b.strategyName),
		);
		return (
			<Stack gap="xs">
				<Group justify="space-between">
					<Text size="sm" fw={500}>
						Subgraph Results ({sorted.length} strategies)
					</Text>
					<Text size="xs" c="dimmed">
						Total time: {totalDurationMs.toFixed(1)}ms
					</Text>
				</Group>
				<Box style={{ overflowX: "auto" }}>
					<Table striped highlightOnHover horizontalSpacing="sm">
						<Table.Thead>
							<Table.Tr>
								<Table.Th>Strategy</Table.Th>
								<Table.Th>Extracted paths</Table.Th>
								<Table.Th>Retention</Table.Th>
								<Table.Th>Ranked paths</Table.Th>
								<Table.Th>Mean salience</Table.Th>
								<Table.Th>Rank time (ms)</Table.Th>
								<Table.Th>Total (ms)</Table.Th>
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>
							{sorted.map((entry) => {
								const strategy =
									getSubgraphExtractionStrategy(entry.strategyName)?.label ??
									entry.strategyName;
								return (
									<Table.Tr key={entry.strategyName}>
										<Table.Td>
											<Text size="sm" fw={500}>
												{strategy}
											</Text>
										</Table.Td>
										<Table.Td>
											<StatValue value={entry.extractedPathsCount} />
										</Table.Td>
										<Table.Td>
											<Text size="sm" ff="monospace">
												{(entry.retentionRatio * 100).toFixed(1)}%
											</Text>
										</Table.Td>
										<Table.Td>
											<StatValue value={entry.rankedPathsCount} />
										</Table.Td>
										<Table.Td>
											<Text size="sm" ff="monospace">
												{entry.meanSalience.toFixed(4)}
											</Text>
										</Table.Td>
										<Table.Td>
											<Text size="sm" ff="monospace">
												{entry.rankingDurationMs.toFixed(1)}
											</Text>
										</Table.Td>
										<Table.Td>
											<Text size="sm" ff="monospace">
												{entry.totalDurationMs.toFixed(1)}
											</Text>
										</Table.Td>
									</Table.Tr>
								);
							})}
						</Table.Tbody>
					</Table>
				</Box>
			</Stack>
		);
	}

	if (comparisonStage === "ranking") {
		const rows = rankingEntries ?? [];
		if (rows.length === 0) {
			return (
				<Text size="sm" c="dimmed" ta="center" py="xl">
					No ranking comparison results yet. Select ranking algorithms and run
					comparison.
				</Text>
			);
		}

		const sorted = [...rows].sort((a, b) => b.meanSalience - a.meanSalience);
		return (
			<Stack gap="xs">
				<Group justify="space-between">
					<Text size="sm" fw={500}>
						Ranking Results ({sorted.length} algorithms)
					</Text>
					<Text size="xs" c="dimmed">
						Total time: {totalDurationMs.toFixed(1)}ms
					</Text>
				</Group>
				<Box style={{ overflowX: "auto" }}>
					<Table striped highlightOnHover horizontalSpacing="sm">
						<Table.Thead>
							<Table.Tr>
								<Table.Th>Ranking algorithm</Table.Th>
								<Table.Th>MI Variant</Table.Th>
								<Table.Th>Paths</Table.Th>
								<Table.Th>Mean salience</Table.Th>
								<Table.Th>Time (ms)</Table.Th>
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>
							{sorted.map((entry) => {
								const rankingLabel =
									getRankingAlgorithm(entry.rankingAlgorithmName)?.label ??
									entry.rankingAlgorithmName;
								const miLabel =
									getMIVariant(entry.miVariant)?.label ?? entry.miVariant;
								return (
									<Table.Tr key={entry.rankingAlgorithmName}>
										<Table.Td>
											<Text size="sm" fw={500}>
												{rankingLabel}
											</Text>
										</Table.Td>
										<Table.Td>
											<Text size="sm">{miLabel}</Text>
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
								);
							})}
						</Table.Tbody>
					</Table>
				</Box>
			</Stack>
		);
	}

	if (comparisonStage === "seed-selection") {
		const rows = seedEntries ?? [];
		if (rows.length === 0) {
			return (
				<Text size="sm" c="dimmed" ta="center" py="xl">
					No seed strategy results yet. Select seed strategies and run
					comparison.
				</Text>
			);
		}

		const sorted = [...rows].sort(
			(a, b) =>
				b.normalised.nodesVisitedPerSeed - a.normalised.nodesVisitedPerSeed ||
				a.strategyName.localeCompare(b.strategyName),
		);
		return (
			<Stack gap="xs">
				<Group justify="space-between">
					<Text size="sm" fw={500}>
						Seed Strategy Results ({sorted.length} strategies)
					</Text>
					<Text size="xs" c="dimmed">
						Total time: {totalDurationMs.toFixed(1)}ms
					</Text>
				</Group>
				<Box style={{ overflowX: "auto" }}>
					<Table striped highlightOnHover horizontalSpacing="sm">
						<Table.Thead>
							<Table.Tr>
								<Table.Th>Seed Strategy</Table.Th>
								<Table.Th>Derived seeds</Table.Th>
								<Table.Th>Nodes/seed</Table.Th>
								<Table.Th>Edges/seed</Table.Th>
								<Table.Th>Paths/seed</Table.Th>
								<Table.Th>Iterations/seed</Table.Th>
							</Table.Tr>
						</Table.Thead>
						<Table.Tbody>
							{sorted.map((entry) => {
								const strategy = getSeedSelectionStrategy(entry.strategyName);
								return (
									<Table.Tr key={entry.strategyName}>
										<Table.Td>
											<Text size="sm" fw={500}>
												{strategy?.label ?? entry.strategyName}
											</Text>
										</Table.Td>
										<Table.Td>
											<StatValue value={entry.derivedSeeds.length} />
										</Table.Td>
										<Table.Td>
											<Text size="sm" ff="monospace">
												{entry.normalised.nodesVisitedPerSeed.toFixed(2)}
											</Text>
										</Table.Td>
										<Table.Td>
											<Text size="sm" ff="monospace">
												{entry.normalised.edgesTraversedPerSeed.toFixed(2)}
											</Text>
										</Table.Td>
										<Table.Td>
											<Text size="sm" ff="monospace">
												{entry.normalised.pathsFoundPerSeed.toFixed(2)}
											</Text>
										</Table.Td>
										<Table.Td>
											<Text size="sm" ff="monospace">
												{entry.normalised.iterationsPerSeed.toFixed(2)}
											</Text>
										</Table.Td>
									</Table.Tr>
								);
							})}
						</Table.Tbody>
					</Table>
				</Box>
			</Stack>
		);
	}

	if (comparisonStage === "mi") {
		const rows = miEntries ?? [];
		if (rows.length === 0) {
			return (
				<Text size="sm" c="dimmed" ta="center" py="xl">
					No MI comparison results yet. Select MI variants and run comparison.
				</Text>
			);
		}

		const sorted = [...rows].sort(
			(a, b) =>
				b.meanSalience - a.meanSalience || a.variant.localeCompare(b.variant),
		);
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
		return bNodes - aNodes || a.algorithmName.localeCompare(b.algorithmName);
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
