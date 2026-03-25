/**
 * Lint-staged configuration for graphwise.
 *
 * Runs ESLint with --fix on staged files.
 * Type checking runs on the full project (tsc needs tsconfig.json context).
 * Test fixtures are excluded from tsc to avoid tsconfig conflicts.
 */
export default {
	/**
	 * @param {string[]} files
	 * @returns {string | string[]}
	 */
	"*.{ts,tsx}": (files) => {
		const filtered = files.filter(
			(file) =>
				typeof file === "string" && !file.includes("__tests__/fixtures"),
		);
		if (filtered.length === 0) {
			return "eslint --cache --fix";
		}
		return ["eslint --cache --fix", "tsc --noEmit --incremental false"];
	},
	"*.js": ["eslint --cache --fix"],
	"*.md": ["eslint --cache --fix"],
	"*.json": ["eslint --cache --fix"],
};
