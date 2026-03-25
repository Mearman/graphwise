import { type ReactNode } from "react";
import { MantineProvider } from "@mantine/core";
import { theme } from "./theme";
import { AppShell } from "./components/layout/AppShell";

import "@mantine/core/styles.css";

export function App(): ReactNode {
	return (
		<MantineProvider theme={theme}>
			<AppShell>
				<div>Graphwise Demo — Loading...</div>
			</AppShell>
		</MantineProvider>
	);
}
