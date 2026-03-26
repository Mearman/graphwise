import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ColorSchemeScript } from "@mantine/core";
import { App } from "./App";

const rootElement = document.getElementById("root");
if (rootElement === null) {
	throw new Error("Root element not found");
}

createRoot(rootElement).render(
	<StrictMode>
		<ColorSchemeScript defaultColorScheme="auto" />
		<App />
	</StrictMode>,
);
