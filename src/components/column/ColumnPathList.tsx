import {
	type ReactNode,
	useState,
	useCallback,
	useEffect,
	useRef,
} from "react";
import { Stack, Text, Box, Group, Badge } from "@mantine/core";
import type { Core } from "cytoscape";
import type { ExpansionPath } from "graphwise/expansion";

interface ColumnPathListProps {
	readonly paths: readonly ExpansionPath[];
	readonly cy: Core | null;
}

function PathCard({
	path,
	rank,
}: {
	readonly path: ExpansionPath;
	readonly rank: number;
}): ReactNode {
	return (
		<Group justify="space-between">
			<Badge size="lg" variant="light">
				#{rank}
			</Badge>
			<Text size="xs" truncate>
				{path.nodes.join(" → ")}
			</Text>
		</Group>
	);
}

function PathItem({
	path,
	rank,
	onClick,
	isHighlighted,
}: {
	readonly path: ExpansionPath;
	readonly rank: number;
	readonly onClick: () => void;
	readonly isHighlighted: boolean;
}): ReactNode {
	return (
		<Box
			onClick={onClick}
			style={{
				cursor: "pointer",
				opacity: isHighlighted ? 1 : 0.7,
				transform: isHighlighted ? "scale(1.02)" : "scale(1)",
				transition: "all 0.15s ease",
			}}
		>
			<PathCard path={path} rank={rank} />
		</Box>
	);
}

export function ColumnPathList({ paths, cy }: ColumnPathListProps): ReactNode {
	const [highlightedPath, setHighlightedPath] = useState<number | null>(null);
	const prevHighlightedRef = useRef<number | null>(null);

	const handlePathClick = useCallback((index: number) => {
		setHighlightedPath((prev) => (prev === index ? null : index));
	}, []);

	// Handle path highlighting on the graph
	useEffect(() => {
		if (cy === null) return;

		// Clear previous highlighting
		cy.edges().removeClass("highlighted-path");
		cy.nodes().removeClass("highlighted-path");

		if (highlightedPath === null) return;

		const path = paths[highlightedPath];
		if (path === undefined) return;

		// Highlight nodes in the path
		for (const nodeId of path.nodes) {
			cy.getElementById(nodeId).addClass("highlighted-path");
		}

		// Highlight edges between consecutive nodes
		for (let i = 0; i < path.nodes.length - 1; i++) {
			const source = path.nodes[i];
			const target = path.nodes[i + 1];
			if (source === undefined || target === undefined) continue;

			const edge = cy.edges().filter((e) => {
				const s = e.source().id();
				const t = e.target().id();
				return (s === source && t === target) || (s === target && t === source);
			});
			edge.addClass("highlighted-path");
		}

		prevHighlightedRef.current = highlightedPath;

		// Cleanup on unmount or when highlight changes
		return () => {
			if (prevHighlightedRef.current === highlightedPath) {
				cy.edges().removeClass("highlighted-path");
				cy.nodes().removeClass("highlighted-path");
			}
		};
	}, [cy, highlightedPath, paths]);

	if (paths.length === 0) {
		return (
			<Text size="xs" c="dimmed" ta="center">
				No paths ranked
			</Text>
		);
	}

	return (
		<Stack gap="xs">
			<Text size="xs" fw={500}>
				{paths.length} {paths.length === 1 ? "path" : "paths"}
			</Text>
			{paths.map((path, idx) => (
				<PathItem
					key={idx}
					path={path}
					rank={idx + 1}
					onClick={() => {
						handlePathClick(idx);
					}}
					isHighlighted={highlightedPath === idx}
				/>
			))}
		</Stack>
	);
}
