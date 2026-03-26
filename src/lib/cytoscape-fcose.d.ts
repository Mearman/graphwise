declare module "cytoscape-fcose" {
	const fcose: (cy: typeof import("cytoscape")) => void;
	export = fcose;
}
