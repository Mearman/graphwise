import { useState, useEffect, useCallback } from "react";
import {
	Popover,
	TextInput,
	Select,
	NumberInput,
	Button,
	Stack,
	Group,
} from "@mantine/core";
import type { NodeId } from "graphwise/graph";
import { useGraphStore } from "../../state/graph-store";

export interface NodeEditorProps {
	readonly nodeId: NodeId | null;
	readonly opened: boolean;
	readonly onClose: () => void;
}

export function NodeEditor({
	nodeId,
	opened,
	onClose,
}: NodeEditorProps): React.ReactElement | null {
	const graph = useGraphStore((state) => state.graph);
	const updateNode = useGraphStore((state) => state.updateNode);

	const [label, setLabel] = useState("");
	const [type, setType] = useState("node");
	const [weight, setWeight] = useState(1);

	// Find the node data from the graph
	const nodeData = nodeId !== null ? graph.getNode(nodeId) : undefined;

	// Reset form values when node changes
	useEffect(() => {
		if (nodeData) {
			const labelValue =
				typeof nodeData.label === "string" ? nodeData.label : nodeId;
			setLabel(labelValue ?? "");
			setType(nodeData.type ?? "node");
			setWeight(nodeData.weight ?? 1);
		} else {
			setLabel("");
			setType("node");
			setWeight(1);
		}
	}, [nodeData, nodeId]);

	const handleSave = useCallback(() => {
		if (nodeId !== null) {
			updateNode(nodeId, { label, type, weight });
		}
		onClose();
	}, [nodeId, label, type, weight, updateNode, onClose]);

	if (nodeId === null) {
		return null;
	}

	return (
		<Popover opened={opened} onClose={onClose} position="bottom" trapFocus>
			<Popover.Target>
				<div style={{ width: "100%", height: "100%" }} />
			</Popover.Target>
			<Popover.Dropdown>
				<Stack gap="md">
					<TextInput
						label="Label"
						value={label}
						onChange={(event) => {
							setLabel(event.currentTarget.value);
						}}
						placeholder="Enter node label"
						required
					/>
					<Select
						label="Type"
						value={type}
						onChange={(value) => {
							setType(value ?? "node");
						}}
						data={[
							{ value: "node", label: "Node" },
							{ value: "person", label: "Person" },
							{ value: "document", label: "Document" },
							{ value: "concept", label: "Concept" },
							{ value: "event", label: "Event" },
						]}
						required
					/>
					<NumberInput
						label="Weight"
						value={weight}
						onChange={(value) => {
							setWeight(typeof value === "number" ? value : 1);
						}}
						min={0}
						step={1}
						required
					/>
					<Group justify="flex-end" gap="sm">
						<Button variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button onClick={handleSave}>Save</Button>
					</Group>
				</Stack>
			</Popover.Dropdown>
		</Popover>
	);
}
