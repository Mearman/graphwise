import type { UserConfig } from "@commitlint/types";

/**
 * Commitlint configuration for graphwise.
 *
 * Enforces conventional commits with optional scope validation.
 * Format: type(scope): description
 *
 * Allowed scopes match source module structure.
 * Note: Commits must use British English spelling and grammar.
 */
const config: UserConfig = {
	extends: ["@commitlint/config-conventional"],
	rules: {
		"scope-enum": [
			2, // error severity
			"always",
			[
				// Source modules
				"graph",
				"expansion",
				"ranking",
				"traversal",
				"structures",
				"extraction",
				"seeds",
				"utils",
				"schemas",
				"gpu",
				// Build/tooling
				"build",
				"release",
				"ci",
				"deps",
			],
		],
	},
};

export default config;
