/**
 * Lint-staged configuration for graphwise.
 *
 * Runs ESLint with --fix on staged TypeScript files.
 */
export default {
	"*.{ts,tsx}": ["eslint --fix"],
};
