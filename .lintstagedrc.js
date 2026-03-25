/**
 * Lint-staged configuration for graphwise.
 *
 * Runs ESLint with --fix on staged TypeScript files.
 */
export default {
	"*.{ts,tsx}": ["eslint --cache --fix", "tsc --noEmit"],
	"*.js": ["eslint --cache --fix"],
	"*.md": ["eslint --cache --fix"],
	"*.json": ["eslint --cache --fix"],
};
