import eslint from "@eslint/js";
import type { Rule } from "eslint";
import { defineConfig } from "eslint/config";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import prettier from "eslint-plugin-prettier";
import tseslint from "typescript-eslint";

// ---------------------------------------------------------------------------
// Custom rules: barrel export discipline
// ---------------------------------------------------------------------------

const noReExports: Rule.RuleModule = {
	meta: {
		type: "problem",
		messages: {
			noReExport:
				"Re-exports (export ... from) are only allowed in index files.",
		},
	},
	create(context: Rule.RuleContext) {
		const filename = context.filename;
		const isIndex = /\/index\.[cm]?[jt]sx?$/.test(filename);
		if (isIndex) return {};

		return {
			ExportNamedDeclaration(node) {
				if (node.source !== null && node.source !== undefined) {
					context.report({ node, messageId: "noReExport" });
				}
			},
			ExportAllDeclaration(node) {
				context.report({ node, messageId: "noReExport" });
			},
		};
	},
};

const indexReExportsOnly: Rule.RuleModule = {
	meta: {
		type: "problem",
		messages: {
			noLogic:
				"Index files must only contain re-exports (export ... from). No declarations, functions, or logic.",
		},
	},
	create(context: Rule.RuleContext) {
		const filename = context.filename;
		const isIndex = /\/index\.[cm]?[jt]sx?$/.test(filename);
		if (!isIndex) return {};

		return {
			ExportNamedDeclaration(node) {
				// Re-exports have a source — those are fine
				if (node.source !== null && node.source !== undefined) return;
				// Anything else (export function, export const, export {}) is logic
				context.report({ node, messageId: "noLogic" });
			},
			ExportDefaultDeclaration(node) {
				context.report({ node, messageId: "noLogic" });
			},
			VariableDeclaration(node) {
				context.report({ node, messageId: "noLogic" });
			},
			FunctionDeclaration(node) {
				context.report({ node, messageId: "noLogic" });
			},
			ClassDeclaration(node) {
				context.report({ node, messageId: "noLogic" });
			},
		};
	},
};

const noPointlessReassignments: Rule.RuleModule = {
	meta: {
		type: "problem",
		messages: {
			pointlessReassignment:
				"Pointless reassignment. {{ name }} is just an alias for {{ value }}. Use the original directly instead.",
		},
	},
	create(context: Rule.RuleContext) {
		// Store info about variables that might be pointless aliases
		const aliasVariables = new Map<
			string,
			{
				name: string;
				initName: string;
				loc: { line: number; column: number };
			}
		>();

		return {
			VariableDeclarator(node) {
				if (node.id.type !== "Identifier" || node.init?.type !== "Identifier") {
					return;
				}
				// Skip underscore prefix patterns
				if (node.id.name.startsWith("_")) {
					return;
				}
				// Track the variable - we'll look up the node by loc when reporting
				aliasVariables.set(node.id.name, {
					name: node.id.name,
					initName: node.init.name,
					loc: {
						line: node.loc?.start.line ?? 0,
						column: node.loc?.start.column ?? 0,
					},
				});
			},
			AssignmentExpression(node) {
				// If variable is reassigned, it's not a pointless alias - remove from tracking
				if (node.left.type === "Identifier") {
					aliasVariables.delete(node.left.name);
				}
			},
			UpdateExpression(node) {
				// Count ++/-- as reassignments too - remove from tracking
				if (node.argument.type === "Identifier") {
					aliasVariables.delete(node.argument.name);
				}
			},
			"Program:exit"(programNode) {
				// Only report variables that were NEVER reassigned
				for (const { name, initName, loc } of aliasVariables.values()) {
					context.report({
						node: programNode,
						messageId: "pointlessReassignment",
						data: {
							name,
							value: initName,
						},
						loc,
					});
				}
			},
		};
	},
};

const barrelSiblingExportsOnly: Rule.RuleModule = {
	meta: {
		type: "problem",
		messages: {
			invalidPath:
				"Barrel exports must reference directories only (e.g. './sibling' or './subdir'), not files (e.g. '{{ path }}'). Directories resolve to their index file.",
		},
	},
	create(context: Rule.RuleContext) {
		const filename = context.filename;
		const isIndex = /\/index\.[cm]?[jt]sx?$/.test(filename);
		if (!isIndex) return {};

		return {
			ExportNamedDeclaration(node) {
				if (!node.source) return;
				const path = node.source.value;
				if (typeof path === "string" && !isValidSiblingPath(path)) {
					context.report({
						node,
						messageId: "invalidPath",
						data: { path },
					});
				}
			},
			ExportAllDeclaration(node) {
				const path = node.source.value;
				if (typeof path === "string" && !isValidSiblingPath(path)) {
					context.report({
						node,
						messageId: "invalidPath",
						data: { path },
					});
				}
			},
		};
	},
};

/**
 * Check if a barrel export path is valid.
 * Valid: './sibling', './subdir', './subdir/nested'
 * Invalid: '../parent', './file.js', './dir/file.ts'
 */
function isValidSiblingPath(path: string): boolean {
	// Must start with './'
	if (!path.startsWith("./")) return false;

	// Cannot contain '../' (parent directory traversal)
	if (path.includes("../")) return false;

	// Cannot have file extension at the end (no .js, .ts, .mjs, etc.)
	// This ensures only directory imports which resolve to index files
	if (/\.\w+$/.test(path)) return false;

	return true;
}

const barrelPlugin = {
	rules: {
		"no-re-exports": noReExports,
		"index-re-exports-only": indexReExportsOnly,
		"no-pointless-reassignments": noPointlessReassignments,
		"sibling-exports-only": barrelSiblingExportsOnly,
	},
};

// ---------------------------------------------------------------------------
// Custom rules: test file naming
// ---------------------------------------------------------------------------

const testFileNaming: Rule.RuleModule = {
	meta: {
		type: "problem",
		messages: {
			invalidTestFileName:
				"Test files must end with '.unit.test.ts' or '.integration.test.ts', not '.test.ts'.",
		},
	},
	create(context: Rule.RuleContext) {
		const filename = context.filename;
		// Check if it's a .test.ts file but NOT .unit.test.ts or .integration.test.ts
		const isTestFile = filename.endsWith(".test.ts");
		const hasValidSuffix =
			filename.endsWith(".unit.test.ts") ||
			filename.endsWith(".integration.test.ts");

		if (isTestFile && !hasValidSuffix) {
			return {
				Program(node) {
					context.report({ node, messageId: "invalidTestFileName" });
				},
			};
		}
		return {};
	},
};

const testingPlugin = {
	rules: {
		"test-file-naming": testFileNaming,
	},
};

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export default defineConfig(
	{
		ignores: [
			"dist/**",
			"node_modules/**",
			"coverage/**",
			".turbo/**",
			"commitlint.config.ts",
		],
	},
	eslint.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	{
		languageOptions: {
			ecmaVersion: 2022,
			parserOptions: {
				projectService: {
					allowDefaultProject: [".lintstagedrc.js"],
				},
				tsconfigRootDir: import.meta.dirname,
				lib: ["es2022", "dom"],
			},
		},
		plugins: {
			"@eslint-community/eslint-comments": eslintComments,
			barrel: barrelPlugin,
			testing: testingPlugin,
			prettier,
		},
		rules: {
			// Prettier
			"prettier/prettier": [
				"error",
				{
					useTabs: true,
					quotes: "double",
				},
			],
			// Barrel discipline
			"barrel/no-re-exports": "error",
			"barrel/index-re-exports-only": "error",
			"barrel/no-pointless-reassignments": "error",
			"barrel/sibling-exports-only": "error",
			// Test file naming
			"testing/test-file-naming": "error",
			// ESLint comments
			"@eslint-community/eslint-comments/no-use": ["error", { allow: [] }],
			// TypeScript strict
			"@typescript-eslint/consistent-type-assertions": [
				"error",
				{ assertionStyle: "never" },
			],
			"@typescript-eslint/no-explicit-any": "error",
			"@typescript-eslint/no-non-null-assertion": "error",
			"@typescript-eslint/no-unused-vars": "error",
			"@typescript-eslint/explicit-function-return-type": [
				"error",
				{ allowExpressions: true },
			],
			"@typescript-eslint/strict-boolean-expressions": "error",
		},
	},
	// Test file overrides - relax rules for tests
	{
		files: ["src/**/*.unit.test.ts", "src/**/*.integration.test.ts"],
		rules: {},
	},
);
