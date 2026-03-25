import { type ReactNode, useEffect, useCallback } from "react";
import {
	Paper,
	Text,
	Group,
	Button,
	Box,
	Progress,
	Stack,
} from "@mantine/core";
import {
	IconPlayerPlay,
	IconPlayerPause,
	IconPlayerSkipBack,
	IconPlayerSkipForward,
	IconX,
} from "@tabler/icons-react";
import { useTourStore } from "../../state/tour-store";

export interface TourOverlayProps {
	readonly onComplete: () => void;
}

const TOUR_STEPS: readonly string[] = [
	"Welcome to Graphwise Demo! This guided tour will walk you through the key features of the algorithm visualisation.",
	"The central canvas shows your graph. Nodes represent entities, and edges show relationships between them.",
	"Use the toolbar on the left to add nodes and edges. You can also load preset graphs from the fixtures menu.",
	"Seed nodes are the starting points for expansion algorithms. Click 'Add Seed' to mark nodes as sources, targets, or both.",
	"The algorithm selector lets you choose which expansion algorithm to run. Novel algorithms are highlighted in blue.",
	"Click 'Run Algorithm' to execute the selected algorithm. Watch as the canvas highlights discovered paths.",
	"The animation timeline at the bottom lets you replay the expansion step-by-step. Use play/pause and seek controls.",
	"The comparison panel on the right lets you run multiple algorithms and compare their statistics side by side.",
	"Hover over comparison rows to highlight that algorithm's paths on the canvas.",
	"You're ready to explore! Switch to 'Explore' mode for unrestricted access to all features.",
] as const;

export function TourOverlay({ onComplete }: TourOverlayProps): ReactNode {
	const currentStep = useTourStore((state) => state.currentStep);
	const totalSteps = useTourStore((state) => state.totalSteps);
	const isAutoPlaying = useTourStore((state) => state.isAutoPlaying);
	const nextStep = useTourStore((state) => state.nextStep);
	const previousStep = useTourStore((state) => state.previousStep);
	const goToStep = useTourStore((state) => state.goToStep);
	const toggleAutoPlay = useTourStore((state) => state.toggleAutoPlay);
	const setAutoPlaying = useTourStore((state) => state.setAutoPlaying);

	const stepContent = TOUR_STEPS[currentStep] ?? "";
	const progress = ((currentStep + 1) / totalSteps) * 100;

	// Auto-advance timer
	useEffect(() => {
		if (!isAutoPlaying) return;

		const timer = setTimeout(() => {
			if (currentStep < totalSteps - 1) {
				nextStep();
			} else {
				setAutoPlaying(false);
			}
		}, 5000);

		return () => {
			clearTimeout(timer);
		};
	}, [isAutoPlaying, currentStep, totalSteps, nextStep, setAutoPlaying]);

	const handleSkip = useCallback(() => {
		setAutoPlaying(false);
		onComplete();
	}, [setAutoPlaying, onComplete]);

	const handleNext = useCallback(() => {
		if (currentStep < totalSteps - 1) {
			nextStep();
		} else {
			handleSkip();
		}
	}, [currentStep, totalSteps, nextStep, handleSkip]);

	const handlePrevious = useCallback(() => {
		if (currentStep > 0) {
			previousStep();
		}
	}, [currentStep, previousStep]);

	return (
		<Box
			style={{
				position: "fixed",
				bottom: 80,
				left: "50%",
				transform: "translateX(-50%)",
				zIndex: 1000,
				width: "min(600px, calc(100vw - 32px))",
			}}
		>
			<Paper shadow="lg" p="md" withBorder>
				<Stack gap="sm">
					<Group justify="space-between">
						<Text size="sm" fw={500}>
							Tour — Step {currentStep + 1} of {totalSteps}
						</Text>
						<Button
							size="xs"
							variant="subtle"
							color="gray"
							onClick={handleSkip}
							leftSection={<IconX size={14} />}
						>
							Skip
						</Button>
					</Group>

					<Progress value={progress} size="sm" />

					<Text size="sm" style={{ minHeight: 40 }}>
						{stepContent}
					</Text>

					<Group justify="space-between">
						<Group gap="xs">
							<Button
								size="xs"
								variant="light"
								onClick={toggleAutoPlay}
								leftSection={
									isAutoPlaying ? (
										<IconPlayerPause size={14} />
									) : (
										<IconPlayerPlay size={14} />
									)
								}
							>
								{isAutoPlaying ? "Pause" : "Auto"}
							</Button>
						</Group>

						<Group gap="xs">
							<Button
								size="xs"
								variant="light"
								onClick={handlePrevious}
								disabled={currentStep === 0}
								leftSection={<IconPlayerSkipBack size={14} />}
							>
								Previous
							</Button>
							<Button
								size="xs"
								onClick={handleNext}
								rightSection={<IconPlayerSkipForward size={14} />}
							>
								{currentStep === totalSteps - 1 ? "Finish" : "Next"}
							</Button>
						</Group>
					</Group>

					<Group gap={4} justify="center">
						{Array.from({ length: totalSteps }, (_, i) => (
							<Box
								key={i}
								style={{
									width: 8,
									height: 8,
									borderRadius: "50%",
									backgroundColor:
										i === currentStep
											? "var(--mantine-color-blue-filled)"
											: i < currentStep
												? "var(--mantine-color-gray-4)"
												: "var(--mantine-color-gray-2)",
									cursor: "pointer",
								}}
								onClick={() => {
									goToStep(i);
								}}
							/>
						))}
					</Group>
				</Stack>
			</Paper>
		</Box>
	);
}
