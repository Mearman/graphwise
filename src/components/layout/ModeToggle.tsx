import { type ReactNode } from "react";
import { SegmentedControl } from "@mantine/core";
import { useState } from "react";

type Mode = "tour" | "explore";

export function ModeToggle(): ReactNode {
	const [mode, setMode] = useState<Mode>("tour");

	return (
		<SegmentedControl
			value={mode}
			onChange={(value): void => {
				const newMode = value === "explore" ? "explore" : "tour";
				setMode(newMode);
			}}
			data={[
				{ label: "Tour", value: "tour" },
				{ label: "Explore", value: "explore" },
			]}
			size="sm"
		/>
	);
}
