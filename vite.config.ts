import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import dts from "vite-plugin-dts";
import typegpu from "unplugin-typegpu/vite";

const entries = {
	index: resolve(__dirname, "src/index.ts"),
	graph: resolve(__dirname, "src/graph/index.ts"),
	seeds: resolve(__dirname, "src/seeds/index.ts"),
	traversal: resolve(__dirname, "src/traversal/index.ts"),
	structures: resolve(__dirname, "src/structures/index.ts"),
	utils: resolve(__dirname, "src/utils/index.ts"),
	gpu: resolve(__dirname, "src/gpu/index.ts"),
	schemas: resolve(__dirname, "src/schemas/index.ts"),
	async: resolve(__dirname, "src/async/index.ts"),
	exploration: resolve(__dirname, "src/exploration/index.ts"),
	ranking: resolve(__dirname, "src/ranking/index.ts"),
	"ranking/mi": resolve(__dirname, "src/ranking/mi/index.ts"),
	extraction: resolve(__dirname, "src/extraction/index.ts"),
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
		typegpu(),
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
