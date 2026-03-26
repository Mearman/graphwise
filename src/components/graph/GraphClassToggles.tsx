import { type ReactNode } from "react";
import {
	Popover,
	Button,
	SimpleGrid,
	Switch,
	Tooltip,
	Box,
	Text,
} from "@mantine/core";
import { IconSettings } from "@tabler/icons-react";
import { useGenerationStore } from "../../state/generation-store";
import {
	GRAPH_CLASS_LABELS,
	getDisabledToggles,
	getDisabledReason,
	type GraphClassKey,
} from "../../engine/graph-class";

const TOGGLE_KEYS: readonly GraphClassKey[] = [
	"isDirected",
	"isWeighted",
	"isCyclic",
	"isConnected",
	"isHeterogeneous",
	"isMultigraph",
	"hasSelfLoops",
	"isComplete",
] as const;

export function GraphClassToggles(): ReactNode {
	const graphClass = useGenerationStore((s) => s.graphClass);
	const nodeCount = useGenerationStore((s) => s.nodeCount);
	const setToggle = useGenerationStore((s) => s.setGraphClassToggle);

	const disabled = getDisabledToggles(graphClass, nodeCount);

	return (
		<Popover position="bottom-start" width={280}>
			<Popover.Target>
				<Button
					size="xs"
					variant="light"
					leftSection={<IconSettings size={14} />}
				>
					Graph Class
				</Button>
			</Popover.Target>
			<Popover.Dropdown>
				<Text size="xs" fw={600} mb="xs">
					Atomic Properties
				</Text>
				<SimpleGrid cols={2} spacing="xs" verticalSpacing={6}>
					{TOGGLE_KEYS.map((key) => {
						const isDisabled = disabled[key];
						const reason = getDisabledReason(graphClass, key, nodeCount);
						const toggle = (
							<Switch
								key={key}
								size="xs"
								label={GRAPH_CLASS_LABELS[key]}
								checked={graphClass[key]}
								disabled={isDisabled}
								onChange={(e) => {
									setToggle(key, e.currentTarget.checked);
								}}
							/>
						);

						if (isDisabled && reason !== undefined) {
							return (
								<Tooltip
									key={key}
									label={reason}
									withArrow
									multiline
									w={200}
									fz="xs"
								>
									<Box>{toggle}</Box>
								</Tooltip>
							);
						}

						return toggle;
					})}
				</SimpleGrid>
			</Popover.Dropdown>
		</Popover>
	);
}
