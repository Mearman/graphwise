import { type ReactNode } from "react";
import { Select, Stack, Text } from "@mantine/core";
import { miVariantNames, getMIVariant } from "../../engine/algorithm-registry";
import { usePipelineStore } from "../../state/pipeline-store";
import type { MIVariantName } from "graphwise/ranking/mi";

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
			<Select
				size="xs"
				data={options}
				value={selectedMIVariant}
				onChange={handleChange}
				placeholder="Select MI variant"
			/>
			{selectedInfo !== undefined ? (
				<Text size="xs" c="dimmed">
					{selectedInfo.description}
				</Text>
			) : null}
		</Stack>
	);
}
