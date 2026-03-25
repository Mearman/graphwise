import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";

export default defineConfig({
	base: "/graphwise-demo/",
	plugins: [react(), vanillaExtractPlugin()],
	build: {
		outDir: "dist",
		sourcemap: true,
	},
	test: {
		globals: true,
		environment: "jsdom",
	},
});
