import { Badge } from "@mantine/core";
import {
	getAlgorithm,
	type ExpansionAlgorithmName,
} from "../../engine/algorithm-registry";

interface AlgorithmBadgeProps {
	readonly algorithm: string;
	readonly size?: "xs" | "sm" | "md";
}

const COLOUR_MAP: Record<string, string> = {
	bfs: "blue",
	dfs: "red",
	dome: "green",
	edge: "purple",
	sage: "orange",
	parse: "grape",
	random: "gray",
};

const VALID_ALGORITHMS = new Set<string>([
	"base",
	"dome",
	"edge",
	"hae",
	"pipe",
	"sage",
	"reach",
	"maze",
	"tide",
]);

function isExpansionAlgorithmName(
	value: unknown,
): value is ExpansionAlgorithmName {
	return typeof value === "string" && VALID_ALGORITHMS.has(value);
}

function getAlgorithmColour(algorithm: string): string {
	return COLOUR_MAP[algorithm.toLowerCase()] ?? "gray";
}

export function AlgorithmBadge({
	algorithm,
	size = "sm",
}: AlgorithmBadgeProps): React.ReactElement {
	const meta = isExpansionAlgorithmName(algorithm)
		? getAlgorithm(algorithm)
		: undefined;
	const label = meta?.label ?? algorithm;
	const colour = getAlgorithmColour(algorithm);

	return (
		<Badge size={size} color={colour} variant="filled">
			{label}
		</Badge>
	);
}
