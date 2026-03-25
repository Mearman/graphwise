import { Group, Button, Text, Stack } from "@mantine/core";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";

interface TourNavigationProps {
	readonly currentStep: number;
	readonly totalSteps: number;
	readonly onPrev: () => void;
	readonly onNext: () => void;
	readonly onFinish: () => void;
}

export function TourNavigation({
	currentStep,
	totalSteps,
	onPrev,
	onNext,
	onFinish,
}: TourNavigationProps): React.ReactElement {
	return (
		<Stack gap="md" mt="md">
			<Group justify="center" gap="md">
				<Button
					variant="default"
					size="sm"
					onClick={onPrev}
					disabled={currentStep === 0}
					leftSection={<IconChevronLeft size={16} />}
				>
					Previous
				</Button>

				<Text size="sm" fw={500}>
					{currentStep + 1} / {totalSteps}
				</Text>

				<Button
					variant="default"
					size="sm"
					onClick={onNext}
					disabled={currentStep === totalSteps - 1}
					rightSection={<IconChevronRight size={16} />}
				>
					Next
				</Button>
			</Group>

			{currentStep === totalSteps - 1 && (
				<Button fullWidth onClick={onFinish} color="green">
					Finish & Explore
				</Button>
			)}
		</Stack>
	);
}
