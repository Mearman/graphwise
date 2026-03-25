import { type ReactNode } from "react";
import { Stack, Checkbox, Group, Text, Badge, Divider } from "@mantine/core";
import {
	expansionAlgorithmNames,
	getAlgorithm,
	type ExpansionAlgorithmName,
} from "../../engine/algorithm-registry";
import { useComparisonStore } from "../../state/comparison-store";

export type AlgorithmSelectorProps = Record<string, never>;

export function AlgorithmSelector(_props: AlgorithmSelectorProps): ReactNode {
	const selectedAlgorithms = useComparisonStore(
		(state) => state.selectedAlgorithms,
	);
	const toggleAlgorithm = useComparisonStore((state) => state.toggleAlgorithm);

	const novelAlgorithms = expansionAlgorithmNames().filter(
		(name) => getAlgorithm(name)?.category === "novel",
	);
	const baselineAlgorithms = expansionAlgorithmNames().filter(
		(name) => getAlgorithm(name)?.category === "baseline",
	);

	return (
		<Stack gap="xs">
			<Text size="sm" fw={500}>
				Select Algorithms
			</Text>

			<Text size="xs" c="dimmed">
				Novel Algorithms
			</Text>
			<Stack gap={4}>
				{novelAlgorithms.map((name) => (
					<AlgorithmCheckbox
						key={name}
						name={name}
						checked={selectedAlgorithms.includes(name)}
						onChange={() => {
							toggleAlgorithm(name);
						}}
					/>
				))}
			</Stack>

			<Divider my="xs" />

			<Text size="xs" c="dimmed">
				Baselines
			</Text>
			<Stack gap={4}>
				{baselineAlgorithms.map((name) => (
					<AlgorithmCheckbox
						key={name}
						name={name}
						checked={selectedAlgorithms.includes(name)}
						onChange={() => {
							toggleAlgorithm(name);
						}}
					/>
				))}
			</Stack>

			<Text size="xs" c="dimmed" mt="xs">
				{selectedAlgorithms.length} algorithm
				{selectedAlgorithms.length === 1 ? "" : "s"} selected
			</Text>
		</Stack>
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
