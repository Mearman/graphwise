import { type ReactNode } from "react";
import {
	Stack,
	Radio,
	Checkbox,
	Group,
	Text,
	Badge,
	Divider,
	Button,
} from "@mantine/core";
import {
	expansionAlgorithmNames,
	getAlgorithm,
	type ExpansionAlgorithmName,
} from "../../engine/algorithm-registry";
import { usePipelineStore } from "../../state/pipeline-store";

export type AlgorithmSelectorProps = Record<string, never>;

export function AlgorithmSelector(_props: AlgorithmSelectorProps): ReactNode {
	const primaryAlgorithm = usePipelineStore((s) => s.primaryAlgorithm);
	const setPrimaryAlgorithm = usePipelineStore(
		(state) => state.setPrimaryAlgorithm,
	);
	const comparisonAlgorithms = usePipelineStore(
		(state) => state.comparisonAlgorithms,
	);
	const toggleComparisonAlgorithm = usePipelineStore(
		(state) => state.toggleComparisonAlgorithm,
	);

	const novelAlgorithms = expansionAlgorithmNames().filter(
		(name) => getAlgorithm(name)?.category === "novel",
	);
	const baselineAlgorithms = expansionAlgorithmNames().filter(
		(name) => getAlgorithm(name)?.category === "baseline",
	);

	const handleSelectAllNovel = (): void => {
		for (const name of novelAlgorithms) {
			if (!comparisonAlgorithms.includes(name)) {
				toggleComparisonAlgorithm(name);
			}
		}
	};

	const handleSelectAllBaselines = (): void => {
		for (const name of baselineAlgorithms) {
			if (!comparisonAlgorithms.includes(name)) {
				toggleComparisonAlgorithm(name);
			}
		}
	};

	const handleClearComparison = (): void => {
		for (const name of comparisonAlgorithms) {
			toggleComparisonAlgorithm(name);
		}
	};

	return (
		<Stack gap="md">
			{/* Primary Algorithm Selection */}
			<Stack gap="xs">
				<Text size="sm" fw={500}>
					Primary Algorithm
				</Text>
				<Text size="xs" c="dimmed">
					The algorithm to visualise in the animation
				</Text>
				<Radio.Group
					value={primaryAlgorithm ?? ""}
					onChange={(value) => {
						if (isExpansionAlgorithmName(value) && value !== primaryAlgorithm) {
							setPrimaryAlgorithm(value);
						}
					}}
				>
					<Stack gap={4}>
						{novelAlgorithms.slice(0, 6).map((name) => (
							<AlgorithmRadio key={name} name={name} />
						))}
						{novelAlgorithms.length > 6 ? (
							<Text size="xs" c="dimmed">
								+{String(novelAlgorithms.length - 6)} more novel algorithms
							</Text>
						) : null}
					</Stack>
				</Radio.Group>
			</Stack>

			<Divider />

			{/* Comparison Set Selection */}
			<Stack gap="xs">
				<Group justify="space-between">
					<Text size="sm" fw={500}>
						Compare Against
					</Text>
					<Group gap="xs">
						<Button size="xs" variant="light" onClick={handleSelectAllNovel}>
							All Novel
						</Button>
						<Button
							size="xs"
							variant="light"
							onClick={handleSelectAllBaselines}
						>
							All Baselines
						</Button>
						<Button size="xs" variant="subtle" onClick={handleClearComparison}>
							Clear
						</Button>
					</Group>
				</Group>
				<Text size="xs" c="dimmed">
					Select algorithms to compare in the results table
				</Text>

				<Text size="xs" c="dimmed" mt="xs">
					Novel
				</Text>
				<Stack gap={4}>
					{novelAlgorithms.map((name) => (
						<AlgorithmCheckbox
							key={name}
							name={name}
							checked={comparisonAlgorithms.includes(name)}
							onChange={() => {
								toggleComparisonAlgorithm(name);
							}}
						/>
					))}
				</Stack>

				<Text size="xs" c="dimmed" mt="xs">
					Baselines
				</Text>
				<Stack gap={4}>
					{baselineAlgorithms.map((name) => (
						<AlgorithmCheckbox
							key={name}
							name={name}
							checked={comparisonAlgorithms.includes(name)}
							onChange={() => {
								toggleComparisonAlgorithm(name);
							}}
						/>
					))}
				</Stack>

				<Text size="xs" c="dimmed" mt="xs">
					{comparisonAlgorithms.length} algorithm
					{comparisonAlgorithms.length === 1 ? "" : "s"} selected for comparison
				</Text>
			</Stack>
		</Stack>
	);
}

function isExpansionAlgorithmName(
	value: string,
): value is ExpansionAlgorithmName {
	const names = expansionAlgorithmNames();
	const nameList: readonly string[] = names;
	return nameList.includes(value);
}

interface AlgorithmRadioProps {
	readonly name: ExpansionAlgorithmName;
}

function AlgorithmRadio({ name }: AlgorithmRadioProps): ReactNode {
	const info = getAlgorithm(name);
	if (info === undefined) return null;

	return (
		<Radio
			value={name}
			label={
				<Group gap="xs" wrap="nowrap">
					<Text size="sm">{info.label}</Text>
					{info.category === "novel" ? (
						<Badge size="xs" variant="light" color="blue">
							Novel
						</Badge>
					) : null}
				</Group>
			}
			size="sm"
		/>
	);
}

interface AlgorithmCheckboxProps {
	readonly name: ExpansionAlgorithmName;
	readonly checked: boolean;
	readonly onChange: () => void;
}

function AlgorithmCheckbox({
	name,
	checked,
	onChange,
}: AlgorithmCheckboxProps): ReactNode {
	const info = getAlgorithm(name);
	if (info === undefined) return null;

	return (
		<Checkbox
			label={
				<Group gap="xs" wrap="nowrap">
					<Text size="sm">{info.label}</Text>
					{info.category === "novel" ? (
						<Badge size="xs" variant="light" color="blue">
							Novel
						</Badge>
					) : null}
				</Group>
			}
			description={info.description}
			checked={checked}
			onChange={onChange}
			size="sm"
		/>
	);
}
