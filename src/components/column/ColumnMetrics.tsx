import { type ReactNode, useMemo } from "react";
import { Group, Paper, Text, Stack, Box } from "@mantine/core";
import { IconRoute, IconTrendingUp } from "@tabler/icons-react";
import { scaleLinear } from "d3-scale";
import type { PipelineColumn } from "../../state/column-store";
import { useAnimationStore } from "../../state/animation-store";
import { useColumnStore } from "../../state/column-store";
import { buildDiscoveryCurve } from "../../engine/discovery-curve";
import { columnColour } from "../../theme/column-colours";

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

const SVG_HEIGHT = 48;
const LEFT_PAD = 2;
const RIGHT_PAD = 2;
const TOP_PAD = 4;
const BOTTOM_PAD = 4;

export function ColumnMetrics({ column }: ColumnMetricsProps): ReactNode {
	const meanSalience = column.rankingResult?.meanSalience ?? null;
	const finalPathCount = column.expansionResult?.stats.pathsFound ?? 0;

	const algorithmName = column.expansionAlgorithm;
	const columns = useColumnStore((state) => state.columns);
	const columnIndex = columns.findIndex((c) => c.id === column.id);

	const algorithmFrames = useAnimationStore((state) => state.algorithmFrames);
	const syncedFrameIndex = useAnimationStore((state) => state.syncedFrameIndex);

	const curve = useMemo(
		() =>
			buildDiscoveryCurve(
				algorithmName !== null ? (algorithmFrames[algorithmName] ?? []) : [],
			),
		[algorithmName, algorithmFrames],
	);

	const currentPathCount =
		curve.length > 0
			? (curve[Math.min(syncedFrameIndex, curve.length - 1)]?.pathCount ?? 0)
			: finalPathCount;

	const maxPaths =
		curve.length > 0 ? (curve[curve.length - 1]?.pathCount ?? 1) : 1;
	const maxFrame =
		curve.length > 0 ? (curve[curve.length - 1]?.frameIndex ?? 1) : 1;

	const colour = columnColour(columnIndex);

	const xScale = useMemo(
		() =>
			scaleLinear()
				.domain([0, Math.max(maxFrame, 1)])
				.range([LEFT_PAD, 100 - RIGHT_PAD]),
		[maxFrame],
	);
	const yScale = useMemo(
		() =>
			scaleLinear()
				.domain([0, Math.max(maxPaths, 1)])
				.range([SVG_HEIGHT - BOTTOM_PAD, TOP_PAD]),
		[maxPaths],
	);

	const polylinePoints = curve
		.map(
			(p) => `${String(xScale(p.frameIndex))},${String(yScale(p.pathCount))}`,
		)
		.join(" ");

	const cursorX = xScale(Math.min(syncedFrameIndex, maxFrame));
	const cursorPoint = curve[Math.min(syncedFrameIndex, curve.length - 1)];
	const cursorY =
		cursorPoint !== undefined
			? yScale(cursorPoint.pathCount)
			: SVG_HEIGHT - BOTTOM_PAD;

	const pathLabel =
		curve.length > 0
			? `${String(currentPathCount)} / ${String(finalPathCount)}`
			: String(finalPathCount);

	return (
		<Stack gap="xs">
			<Group grow>
				<MetricCard
					icon={<IconRoute size={16} />}
					label="Paths"
					value={pathLabel}
				/>
				<MetricCard
					icon={<IconTrendingUp size={16} />}
					label="Mean Salience"
					value={meanSalience !== null ? meanSalience.toFixed(3) : "-"}
				/>
			</Group>

			{curve.length > 1 && (
				<Box style={{ paddingInline: 4 }}>
					<svg
						width="100%"
						height={SVG_HEIGHT}
						viewBox={`0 0 100 ${String(SVG_HEIGHT)}`}
						preserveAspectRatio="none"
						style={{ display: "block" }}
					>
						<polyline
							points={polylinePoints}
							fill="none"
							stroke={colour}
							strokeWidth={1.5}
						/>
						<line
							x1={cursorX}
							y1={TOP_PAD}
							x2={cursorX}
							y2={SVG_HEIGHT - BOTTOM_PAD}
							stroke={colour}
							strokeWidth={1}
							strokeOpacity={0.6}
						/>
						<circle cx={cursorX} cy={cursorY} r={2.5} fill={colour} />
					</svg>
				</Box>
			)}
		</Stack>
	);
}
