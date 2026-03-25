/**
 * Lint-staged configuration for graphwise.
 *
 * Runs ESLint with --fix on staged files.
 * Type checking runs on the full project (tsc needs tsconfig.json context).
 */
export default {
	"*.{ts,tsx}": ["eslint --cache --fix", "tsc --noEmit --incremental false"],
	"*.js": ["eslint --cache --fix"],
	"*.md": ["eslint --cache --fix"],
	"*.json": ["eslint --cache --fix"],
};
