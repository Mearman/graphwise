import { Container, Stack } from "@mantine/core";
import { GraphCanvas } from "../components/graph/GraphCanvas";
import { TourOverlay } from "../components/tour/TourOverlay";

export function TourPage(): React.ReactElement {
	const completeTour = (): void => {
		// Handled by tour store
	};

	return (
		<Container size="lg" py="md">
			<Stack gap="md">
				<div
					style={{
						height: 600,
						border: "1px solid #ddd",
						borderRadius: 8,
						position: "relative",
					}}
				>
					<GraphCanvas />
					<TourOverlay onComplete={completeTour} />
				</div>
			</Stack>
		</Container>
	);
}
