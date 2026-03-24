import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import dts from "vite-plugin-dts";

const entries = {
	index: resolve(__dirname, "src/index.ts"),
	graph: resolve(__dirname, "src/graph/index.ts"),
	seeds: resolve(__dirname, "src/seeds/index.ts"),
	traversal: resolve(__dirname, "src/traversal/index.ts"),
	structures: resolve(__dirname, "src/structures/index.ts"),
	utils: resolve(__dirname, "src/utils/index.ts"),
	gpu: resolve(__dirname, "src/gpu/index.ts"),
	schemas: resolve(__dirname, "src/schemas/index.ts"),
};

export default defineConfig({
	build: {
		target: "es2022",
		lib: {
			entry: entries,
			formats: ["es", "cjs"],
			fileName: (format, entryName) => {
				if (format === "es") {
					return `${entryName}/index.js`;
				}
				return `${entryName}/index.cjs`;
			},
			name: "Graphwise",
		},
		rollupOptions: {
			output: {
				exports: "named",
			},
		},
		sourcemap: true,
		minify: false,
	},
	plugins: [
		dts({
			include: ["src/**/*.ts"],
			outDir: "dist",
			entryRoot: "src",
		}),
	],
	test: {
		include: ["src/**/*.unit.test.ts", "src/**/*.integration.test.ts"],
		coverage: {
			provider: "v8",
			include: ["src/**"],
			exclude: [
				"src/**/*.wgsl",
				"src/**/index.ts", // Barrel files
				"src/**/types.ts", // Type-only files
				"src/**/interfaces.ts", // Interface-only files
			],
			thresholds: {
				lines: 90,
				functions: 75,
				branches: 75,
				statements: 90,
			},
		},
	},
});
