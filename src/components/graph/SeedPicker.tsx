import { useCallback } from "react";
import { Button, Group, Select, Text, Stack } from "@mantine/core";
import type { NodeId } from "graphwise/graph";
import type { Seed } from "graphwise/expansion";
import { useGraphStore } from "../../state/graph-store";

type SeedRole = "source" | "target" | "bidirectional";

export type SeedPickerProps = Record<string, never>;

export function SeedPicker(_props: SeedPickerProps): React.ReactElement {
	const graph = useGraphStore((state) => state.graph);
	const seeds = useGraphStore((state) => state.seeds);
	const setSeeds = useGraphStore((state) => state.setSeeds);
	const nodeIds = Array.from(graph.nodeIds());
	const availableNodes = nodeIds.filter(
		(nodeId) => !seeds.some((seed) => seed.id === nodeId),
	);

	const handleAddSeed = useCallback(() => {
		const firstAvailable = availableNodes[0];
		if (firstAvailable === undefined) return;
		const newSeed: Seed = {
			id: firstAvailable,
			role: "bidirectional",
		};
		setSeeds([...seeds, newSeed]);
	}, [availableNodes, seeds, setSeeds]);

	const handleRemoveSeed = useCallback(
		(seedId: NodeId) => {
			setSeeds(seeds.filter((seed) => seed.id !== seedId));
		},
		[seeds, setSeeds],
	);

	const handleNodeIdChange = useCallback(
		(oldNodeId: NodeId, newNodeId: string) => {
			const currentSeed = seeds.find((s) => s.id === oldNodeId);
			if (currentSeed !== undefined) {
				const newSeeds = seeds.filter((s) => s.id !== oldNodeId);
				const newSeed: Seed = {
					id: newNodeId,
					role: currentSeed.role ?? "bidirectional",
				};
				setSeeds([...newSeeds, newSeed]);
			}
		},
		[seeds, setSeeds],
	);

	const handleRoleChange = useCallback(
		(seedId: NodeId, role: SeedRole) => {
			const updatedSeeds = seeds.map((seed) =>
				seed.id === seedId ? { ...seed, role } : seed,
			);
			setSeeds(updatedSeeds);
		},
		[seeds, setSeeds],
	);

	const roleOptions = [
		{ value: "source", label: "Source" },
		{ value: "target", label: "Target" },
		{ value: "bidirectional", label: "Bidirectional" },
	];

	const isSeedRole = (value: string): value is SeedRole => {
		return (
			value === "source" || value === "target" || value === "bidirectional"
		);
	};

	return (
		<Stack gap="xs">
			<Text size="sm" fw={500}>
				Seed Nodes
			</Text>
			{seeds.map((seed) => (
				<Group key={seed.id} gap="xs" wrap="nowrap">
					<Select
						size="xs"
						value={seed.id}
						data={nodeIds.map((id) => ({ value: id, label: id }))}
						onChange={(value) => {
							if (value !== null && value.length > 0) {
								handleNodeIdChange(seed.id, value);
							}
						}}
						flex={1}
					/>
					<Select
						size="xs"
						value={seed.role ?? "bidirectional"}
						data={roleOptions}
						onChange={(value) => {
							if (value !== null && value.length > 0 && isSeedRole(value)) {
								handleRoleChange(seed.id, value);
							}
						}}
						w={100}
					/>
					<Button
						size="xs"
						variant="subtle"
						color="red"
						onClick={() => {
							handleRemoveSeed(seed.id);
						}}
					>
						Remove
					</Button>
				</Group>
			))}
			<Button
				size="xs"
				onClick={handleAddSeed}
				disabled={availableNodes.length === 0}
			>
				Add Seed
			</Button>
		</Stack>
	);
}
