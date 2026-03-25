import { type ReactNode } from "react";
import { Checkbox, Group, Stack, Text } from "@mantine/core";
import { miVariantNames, getMIVariant } from "../../engine/algorithm-registry";
import { usePipelineStore } from "../../state/pipeline-store";
import type { MIVariantName } from "graphwise/ranking/mi";
import { useComparisonStore } from "../../state/comparison-store";

function isMIVariantName(value: string): value is MIVariantName {
	const validNames = miVariantNames();
	const nameList: readonly string[] = validNames;
	return nameList.includes(value);
}

export type MIVariantSelectorProps = Record<string, never>;

export function MIVariantSelector(_props: MIVariantSelectorProps): ReactNode {
	const selectedMIVariant = usePipelineStore(
		(state) => state.selectedMIVariant,
	);
	const setSelectedMIVariant = usePipelineStore(
		(state) => state.setSelectedMIVariant,
	);
	const selectedMIVariants = useComparisonStore(
		(state) => state.selectedMIVariants,
	);
	const toggleMIVariant = useComparisonStore((state) => state.toggleMIVariant);

	const options = miVariantNames().map((name) => {
		const info = getMIVariant(name);
		return {
			value: name,
			label: info?.label ?? name,
		};
	});

	const selectedInfo = getMIVariant(selectedMIVariant);

	const handleChange = (value: string | null): void => {
		if (value !== null && isMIVariantName(value)) {
			setSelectedMIVariant(value);
		}
	};

	return (
		<Stack gap="xs">
			<Text size="sm" fw={500}>
				MI Variant
			</Text>
			<Group gap="xs" wrap="wrap">
				{options.map((option) => {
					const checked = isMIVariantName(option.value)
						? selectedMIVariants.includes(option.value)
						: false;
					return (
						<Checkbox
							key={option.value}
							size="xs"
							label={option.label}
							checked={checked}
							onChange={() => {
								if (isMIVariantName(option.value)) {
									toggleMIVariant(option.value);
								}
							}}
						/>
					);
				})}
			</Group>
			<Text size="xs" c="dimmed">
				Primary: {selectedMIVariant}
			</Text>
			<Group gap={6} wrap="wrap">
				{options.map((option) => (
					<Text
						key={`${option.value}-primary`}
						size="xs"
						c={option.value === selectedMIVariant ? "blue" : "dimmed"}
						style={{ cursor: "pointer" }}
						onClick={() => {
							handleChange(option.value);
						}}
					>
						{option.label}
					</Text>
				))}
			</Group>
			{selectedInfo !== undefined ? (
				<Text size="xs" c="dimmed">
					{selectedInfo.description}
				</Text>
			) : null}
		</Stack>
	);
}
