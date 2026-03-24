import type { UserConfig } from "@commitlint/types";

/**
 * Commitlint configuration for graphwise.
 *
 * Enforces conventional commits with scope validation.
 * Format: type(scope): description
 *
 * Note: Commits must use British English spelling and grammar.
 */
const config: UserConfig = {
	extends: ["@commitlint/config-conventional"],
	rules: {
		"scope-enum": [
			2, // error severity
			"always",
			[
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
			],
		],
	},
};

export default config;
