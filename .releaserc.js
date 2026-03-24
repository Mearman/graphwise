export default {
	branches: [{ name: "main", channel: "latest" }],
	plugins: [
		[
			"@semantic-release/commit-analyzer",
			{
				preset: "conventionalcommits",
				releaseRules: [
					// These types are ignored by the preset — promote them to patch
					{ type: "refactor", release: "patch" },
					{ type: "docs", release: "patch" },
					{ type: "style", release: "patch" },
					{ type: "test", release: "patch" },
					{ type: "build", release: "patch" },
					{ type: "ci", release: "patch" },
					{ type: "chore", release: "patch" },
				],
			},
		],
		[
			"@semantic-release/release-notes-generator",
			{
				preset: "conventionalcommits",
				presetConfig: {
					types: [
						// Visible by default — keep preset section names
						{ type: "feat", section: "Features" },
						{ type: "fix", section: "Bug Fixes" },
						{ type: "perf", section: "Performance Improvements" },
						{ type: "revert", section: "Reverts" },
						// Hidden by default — unhide with preset section names
						{ type: "refactor", section: "Code Refactoring", hidden: false },
						{ type: "docs", section: "Documentation", hidden: false },
						{ type: "style", section: "Styles", hidden: false },
						{ type: "test", section: "Tests", hidden: false },
						{ type: "build", section: "Build System", hidden: false },
						{ type: "ci", section: "Continuous Integration", hidden: false },
						{ type: "chore", section: "Miscellaneous Chores", hidden: false },
					],
				},
			},
		],
		[
			"@semantic-release/changelog",
			{
				changelogFile: "CHANGELOG.md",
			},
		],
		"@semantic-release/npm",
		[
			"@semantic-release/git",
			{
				assets: ["package.json", "pnpm-lock.yaml", "CHANGELOG.md"],
				message:
					"chore(release): ${nextRelease.version}\n\n${nextRelease.notes}",
			},
		],
		"@semantic-release/github",
	],
};
