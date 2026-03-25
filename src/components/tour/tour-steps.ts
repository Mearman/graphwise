export interface TourStep {
	readonly id: number;
	readonly title: string;
	readonly description: string;
	readonly fixture?: string;
	readonly algorithm?: string;
	readonly autoPlay?: {
		readonly frameStart: number;
		readonly frameEnd: number;
	};
}

export const TOUR_STEPS: readonly TourStep[] = [
	{
		id: 0,
		title: "Welcome to graphwise",
		description:
			"This demo showcases 19 graph expansion algorithms with interactive visualization. Learn how each algorithm explores a graph differently.",
	},
	{
		id: 1,
		title: "Graph Structure",
		description:
			"A graph consists of nodes (circles) and edges (lines connecting them). Seeds mark your starting points for exploration.",
		fixture: "social-hub",
	},
	{
		id: 2,
		title: "BFS Baseline",
		description:
			"Breadth-First Search explores layer by layer. Watch as it expands outward evenly from the seed.",
		fixture: "social-hub",
		algorithm: "bfs",
		autoPlay: { frameStart: 0, frameEnd: 20 },
	},
	{
		id: 3,
		title: "DOME: Hub Deferral",
		description:
			"DOME prioritises low-degree nodes first, deferring high-degree hubs. This reveals different structural patterns.",
		fixture: "social-hub",
		algorithm: "dome",
		autoPlay: { frameStart: 0, frameEnd: 15 },
	},
	{
		id: 4,
		title: "EDGE: Entropy-Driven",
		description:
			"EDGE guides exploration using type entropy, discovering diverse node types early.",
		fixture: "three-communities",
		algorithm: "edge",
	},
	{
		id: 5,
		title: "SAGE: Salience Feedback",
		description:
			"SAGE adapts based on path quality, emphasising salient discoveries as exploration progresses.",
		fixture: "social-hub",
		algorithm: "sage",
	},
	{
		id: 6,
		title: "PARSE Ranking",
		description:
			"After expansion, PARSE ranks discovered paths by salience using Mutual Information variants.",
		fixture: "social-hub",
	},
	{
		id: 7,
		title: "MI Variants",
		description:
			"Compare how Jaccard, SCALE, and SKEW mutual information variants rank the same paths differently.",
		fixture: "city-village",
	},
	{
		id: 8,
		title: "Algorithm Comparison",
		description:
			"Run multiple algorithms on the same graph to compare iterations, nodes visited, and path discovery rates.",
		fixture: "social-hub",
	},
	{
		id: 9,
		title: "Your Turn",
		description:
			"Switch to Explore mode to build custom graphs, experiment with algorithms, and share results via the live URL.",
	},
];
