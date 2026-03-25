import cytoscape, { type Core } from "cytoscape";
import { useEffect, useRef, useState, type RefObject } from "react";

interface UseCytoscapeReturn {
	readonly cy: Core | null;
	readonly containerRef: RefObject<HTMLDivElement | null>;
	readonly isReady: boolean;
}

export function useCytoscape(): UseCytoscapeReturn {
	const containerRef = useRef<HTMLDivElement | null>(null);
	const [cy, setCy] = useState<Core | null>(null);
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		if (!containerRef.current) return;

		const defaultOptions = {
			boxSelectionEnabled: false,
			autounselectify: true,
			minZoom: 0.1,
			maxZoom: 4,
			wheelSensitivity: 0.3,
		};

		const instance = cytoscape({
			container: containerRef.current,
			elements: [],
			style: [
				{
					selector: "node",
					style: {
						"background-color": "#fff",
						"border-color": "#333",
						"border-width": 2,
						color: "#333",
						label: "data(label)",
						"font-size": 14,
						"text-outline-color": "#fff",
						"text-outline-width": 3,
					},
				},
				{
					selector: "edge",
					style: {
						"curve-style": "bezier",
						width: 3,
						"line-color": "#999",
						"target-arrow-color": "#999",
						"target-arrow-shape": "triangle",
						"arrow-scale": 1.5,
					},
				},
			],
			layout: {
				name: "grid",
				rows: 1,
			},
			...defaultOptions,
		});

		setCy(instance);
		setIsReady(true);

		return () => {
			instance.destroy();
			setCy(null);
			setIsReady(false);
		};
	}, []);

	return {
		cy,
		containerRef,
		isReady,
	};
}
