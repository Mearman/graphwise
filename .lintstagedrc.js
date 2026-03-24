/**
 * Lint-staged configuration for graphwise.
 *
 * Runs ESLint with --fix on staged files and re-stages successful changes.
 */
export default {
	"*.{ts,tsx}": ["eslint --fix", "git add"],
};
