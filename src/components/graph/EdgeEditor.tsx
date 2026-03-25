import { useState, useCallback, useEffect } from "react";
import {
	Popover,
	TextInput,
	NumberInput,
	Select,
	Button,
	Stack,
	Group,
} from "@mantine/core";
import { useGraphStore } from "../../state/graph-store";

export interface EdgeEditorProps {
	readonly edgeId: string | null;
	readonly opened: boolean;
	readonly onClose: () => void;
}

export function EdgeEditor({
	edgeId,
	opened,
	onClose,
}: EdgeEditorProps): React.ReactElement | null {
	const [type, setType] = useState("");
	const [weight, setWeight] = useState(1);
	const graph = useGraphStore((state) => state.graph);
	const updateEdge = useGraphStore((state) => state.updateEdge);

	// Parse edge ID to get source and target
	const parts = edgeId?.split("-") ?? [];
	const source = parts[0] ?? "";
	const target = parts[1] ?? "";

	// Get current edge data when edgeId changes
	useEffect(() => {
		if (source.length > 0 && target.length > 0) {
			const currentEdge = graph.getEdge(source, target);
			if (currentEdge !== undefined) {
				setType(currentEdge.type ?? "edge");
				setWeight(currentEdge.weight ?? 1);
			}
		}
	}, [source, target, graph]);

	const handleSave = useCallback(() => {
		if (source.length > 0 && target.length > 0) {
			updateEdge(source, target, { type, weight });
		}
		onClose();
	}, [source, target, type, weight, updateEdge, onClose]);

	if (edgeId === null) {
		return null;
	}

	const edgeTypeOptions = [
		{ value: "edge", label: "Edge" },
		{ value: "cites", label: "Cites" },
		{ value: "references", label: "References" },
		{ value: "relates", label: "Relates" },
		{ value: "author", label: "Author" },
		{ value: "affiliated", label: "Affiliated" },
	];

	return (
		<Popover opened={opened} onClose={onClose} width="auto">
			<Popover.Target>
				<div style={{ width: "100%", height: "100%" }} />
			</Popover.Target>
			<Popover.Dropdown>
				<Stack gap="xs" p="xs">
					<TextInput
						label="Edge ID"
						value={edgeId}
						disabled
						readOnly
						size="sm"
					/>
					<Select
						label="Type"
						value={type}
						onChange={(value) => {
							setType(value ?? "edge");
						}}
						data={edgeTypeOptions}
						size="sm"
					/>
					<NumberInput
						label="Weight"
						value={weight}
						onChange={(value) => {
							setWeight(Number(value));
						}}
						min={0}
						step={0.1}
						size="sm"
					/>
					<Group gap="xs" justify="flex-end" mt="xs">
						<Button onClick={onClose} size="sm" variant="outline">
							Cancel
						</Button>
						<Button onClick={handleSave} size="sm">
							Save
						</Button>
					</Group>
				</Stack>
			</Popover.Dropdown>
		</Popover>
	);
}
