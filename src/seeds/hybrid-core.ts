import type { NodeId, ReadableGraph } from "../graph";
import type { Seed } from "../schemas";

interface PairLike {
	readonly source: Seed;
	readonly target: Seed;
}

export interface EnsemblePair extends PairLike {
	readonly score: number;
	readonly support: number;
	readonly blindVotes: number;
	readonly components: readonly string[];
}

export interface EnsembleComponent {
	readonly id: string;
	readonly weight: number;
	readonly isBlind: boolean;
	readonly select: (
		graph: ReadableGraph,
		nPairs: number,
		rngSeed: number,
	) => readonly PairLike[];
}

export interface EnsembleOptions {
	readonly nPairs: number;
	readonly rngSeed: number;
	readonly oversampleMultiplier?: number;
	readonly blindPriorityBias?: number;
	readonly nodeReusePenalty?: number;
	readonly consensusBonus?: number;
}

interface PairMeta {
	a: NodeId;
	b: NodeId;
	score: number;
	support: number;
	blindVotes: number;
	components: Set<string>;
}

function createRNG(seed: number): () => number {
	let state = seed >>> 0;
	return (): number => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = Math.imul(state ^ (state >>> 15), state | 1);
		t = (t ^ (t >>> 7)) * (t | 0x61c88647);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

function canonicalPair(a: NodeId, b: NodeId): [NodeId, NodeId] {
	return a < b ? [a, b] : [b, a];
}

function pairKey(a: NodeId, b: NodeId): string {
	const [x, y] = canonicalPair(a, b);
	return `${x}|${y}`;
}

function bfsDistances(
	graph: ReadableGraph,
	source: NodeId,
): Map<NodeId, number> {
	const dist = new Map<NodeId, number>([[source, 0]]);
	const queue: NodeId[] = [source];

	while (queue.length > 0) {
		const node = queue.shift();
		if (node === undefined) continue;
		const baseDist = dist.get(node) ?? 0;
		for (const neighbour of graph.neighbours(node)) {
			if (!dist.has(neighbour)) {
				dist.set(neighbour, baseDist + 1);
				queue.push(neighbour);
			}
		}
	}

	return dist;
}

export function degreeDiversePairs(
	graph: ReadableGraph,
	nPairs: number,
	rngSeed: number,
): readonly PairLike[] {
	const rng = createRNG(rngSeed);
	const allNodes = [...graph.nodeIds()];
	if (allNodes.length < 2 || nPairs <= 0) return [];

	const byDegree = allNodes
		.map((id) => ({ id, d: graph.degree(id) }))
		.sort((a, b) => a.d - b.d);

	const n = byDegree.length;
	const low = byDegree
		.slice(0, Math.max(1, Math.floor(n / 3)))
		.map((x) => x.id);
	const high = byDegree
		.slice(Math.max(0, Math.floor((2 * n) / 3)))
		.map((x) => x.id);
	const mid = byDegree
		.slice(Math.max(1, Math.floor(n / 3)), Math.max(1, Math.floor((2 * n) / 3)))
		.map((x) => x.id);

	const pairs: PairLike[] = [];
	const seen = new Set<string>();

	const addRandomPair = (
		aPool: readonly NodeId[],
		bPool?: readonly NodeId[],
	): void => {
		if (aPool.length === 0) return;
		const right = bPool ?? aPool;
		if (right.length === 0) return;
		for (let attempts = 0; attempts < 40; attempts++) {
			const a = aPool[Math.floor(rng() * aPool.length)];
			const b = right[Math.floor(rng() * right.length)];
			if (a === undefined || b === undefined || a === b) continue;
			const key = pairKey(a, b);
			if (seen.has(key)) continue;
			seen.add(key);
			const [x, y] = canonicalPair(a, b);
			pairs.push({ source: { id: x }, target: { id: y } });
			return;
		}
	};

	const lowHighCount = Math.floor(nPairs * 0.5);
	const lowLowCount = Math.floor(nPairs * 0.25);
	const highHighCount = nPairs - lowHighCount - lowLowCount;

	for (let i = 0; i < lowHighCount; i++) addRandomPair(low, high);
	for (let i = 0; i < lowLowCount; i++) addRandomPair(low);
	for (let i = 0; i < highHighCount; i++) addRandomPair(high);

	while (pairs.length < nPairs) {
		if (mid.length > 0) addRandomPair(mid);
		else addRandomPair(allNodes);
		if (
			pairs.length >=
			Math.min(nPairs, (allNodes.length * (allNodes.length - 1)) / 2)
		)
			break;
	}

	return pairs.slice(0, nPairs);
}

export function maxDistancePairs(
	graph: ReadableGraph,
	nPairs: number,
	rngSeed: number,
): readonly PairLike[] {
	const rng = createRNG(rngSeed);
	const nodes = [...graph.nodeIds()];
	if (nodes.length < 2 || nPairs <= 0) return [];

	const sourceLimit = Math.min(nodes.length, 64);
	const shuffled = [...nodes];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		const a = shuffled[i];
		const b = shuffled[j];
		if (a !== undefined && b !== undefined) {
			shuffled[i] = b;
			shuffled[j] = a;
		}
	}

	const ranked: { a: NodeId; b: NodeId; d: number }[] = [];
	const seen = new Set<string>();

	for (const source of shuffled.slice(0, sourceLimit)) {
		const dist = bfsDistances(graph, source);
		for (const [target, d] of dist) {
			if (source === target || d <= 0) continue;
			const key = pairKey(source, target);
			if (seen.has(key)) continue;
			seen.add(key);
			const [a, b] = canonicalPair(source, target);
			ranked.push({ a, b, d });
		}
	}

	ranked.sort((x, y) => y.d - x.d);
	return ranked
		.slice(0, nPairs)
		.map((x) => ({ source: { id: x.a }, target: { id: x.b } }));
}

function labelPropagation(
	graph: ReadableGraph,
	rngSeed: number,
	maxIterations = 30,
): Map<NodeId, number> {
	const rng = createRNG(rngSeed);
	const nodes = [...graph.nodeIds()];
	const labels = new Map<NodeId, number>(
		nodes.map((id, i) => [id, i] as const),
	);
	const order = [...nodes];

	for (let iteration = 0; iteration < maxIterations; iteration++) {
		let changed = false;
		for (let i = order.length - 1; i > 0; i--) {
			const j = Math.floor(rng() * (i + 1));
			const a = order[i];
			const b = order[j];
			if (a !== undefined && b !== undefined) {
				order[i] = b;
				order[j] = a;
			}
		}

		for (const node of order) {
			const counts = new Map<number, number>();
			for (const n of graph.neighbours(node)) {
				const label = labels.get(n);
				if (label === undefined) continue;
				counts.set(label, (counts.get(label) ?? 0) + 1);
			}
			if (counts.size === 0) continue;

			let bestLabel = labels.get(node) ?? 0;
			let bestCount = -1;
			for (const [label, count] of counts) {
				if (count > bestCount || (count === bestCount && rng() < 0.5)) {
					bestCount = count;
					bestLabel = label;
				}
			}

			if ((labels.get(node) ?? -1) !== bestLabel) {
				labels.set(node, bestLabel);
				changed = true;
			}
		}

		if (!changed) break;
	}

	return labels;
}

export function communityBridgePairs(
	graph: ReadableGraph,
	nPairs: number,
	rngSeed: number,
): readonly PairLike[] {
	const labels = labelPropagation(graph, rngSeed);
	const nodes = [...graph.nodeIds()];
	if (nodes.length < 2 || nPairs <= 0) return [];

	const size = new Map<number, number>();
	for (const label of labels.values()) {
		size.set(label, (size.get(label) ?? 0) + 1);
	}

	const ranked: { a: NodeId; b: NodeId; score: number }[] = [];
	for (let i = 0; i < nodes.length; i++) {
		const a = nodes[i];
		if (a === undefined) continue;
		for (let j = i + 1; j < nodes.length; j++) {
			const b = nodes[j];
			if (b === undefined) continue;
			const la = labels.get(a);
			const lb = labels.get(b);
			if (la === undefined || lb === undefined || la === lb) continue;
			const score = (size.get(la) ?? 1) * (size.get(lb) ?? 1);
			ranked.push({ a, b, score });
		}
	}

	ranked.sort((x, y) => y.score - x.score);
	return ranked
		.slice(0, nPairs)
		.map((x) => ({ source: { id: x.a }, target: { id: x.b } }));
}

export function runEnsemble(
	graph: ReadableGraph,
	components: readonly EnsembleComponent[],
	options: EnsembleOptions,
): readonly EnsemblePair[] {
	const nPairs = Math.max(0, options.nPairs);
	if (nPairs === 0) return [];

	const rng = createRNG(options.rngSeed);
	const oversampleMultiplier = options.oversampleMultiplier ?? 3;
	const blindPriorityBias = options.blindPriorityBias ?? 0;
	const nodeReusePenalty = options.nodeReusePenalty ?? 0.15;
	const consensusBonus = options.consensusBonus ?? 0.05;
	const oversample = Math.max(nPairs * oversampleMultiplier, 30);

	const pairMap = new Map<string, PairMeta>();

	components.forEach((component, index) => {
		let pairs: readonly PairLike[];
		try {
			pairs = component.select(
				graph,
				oversample,
				options.rngSeed + (index + 1) * 97,
			);
		} catch {
			pairs = [];
		}
		const m = pairs.length;
		if (m === 0) return;

		for (let rank = 0; rank < m; rank++) {
			const pair = pairs[rank];
			if (pair === undefined) continue;
			const a = pair.source.id;
			const b = pair.target.id;
			if (a === b) continue;
			const [x, y] = canonicalPair(a, b);
			const key = `${x}|${y}`;
			const rankWeight = m <= 1 ? 1 : 1 - rank / (m - 1);
			const componentBonus = component.isBlind ? 1 + blindPriorityBias : 1;
			const score =
				component.weight * componentBonus * (0.5 + 0.5 * rankWeight);

			const existing = pairMap.get(key);
			if (existing === undefined) {
				pairMap.set(key, {
					a: x,
					b: y,
					score,
					support: 1,
					blindVotes: component.isBlind ? 1 : 0,
					components: new Set([component.id]),
				});
			} else {
				existing.score += score;
				existing.support += 1;
				existing.blindVotes += component.isBlind ? 1 : 0;
				existing.components.add(component.id);
			}
		}
	});

	for (const meta of pairMap.values()) {
		meta.score *= 1 + consensusBonus * Math.max(0, meta.support - 1);
	}

	const selected: EnsemblePair[] = [];
	const nodeUsage = new Map<NodeId, number>();
	const candidates = [...pairMap.values()];

	while (candidates.length > 0 && selected.length < nPairs) {
		let bestIndex = -1;
		let bestValue = Number.NEGATIVE_INFINITY;

		for (let i = 0; i < candidates.length; i++) {
			const candidate = candidates[i];
			if (candidate === undefined) continue;
			const usage =
				(nodeUsage.get(candidate.a) ?? 0) + (nodeUsage.get(candidate.b) ?? 0);
			const value = candidate.score - nodeReusePenalty * usage;
			if (value > bestValue) {
				bestValue = value;
				bestIndex = i;
			}
		}

		if (bestIndex < 0) break;
		const [best] = candidates.splice(bestIndex, 1);
		if (best === undefined) break;

		nodeUsage.set(best.a, (nodeUsage.get(best.a) ?? 0) + 1);
		nodeUsage.set(best.b, (nodeUsage.get(best.b) ?? 0) + 1);
		selected.push({
			source: { id: best.a },
			target: { id: best.b },
			score: best.score,
			support: best.support,
			blindVotes: best.blindVotes,
			components: [...best.components].sort(),
		});
	}

	if (selected.length < nPairs) {
		const allNodes = [...graph.nodeIds()];
		const seen = new Set(
			selected.map((p) => pairKey(p.source.id, p.target.id)),
		);
		const maxAttempts = nPairs * 40;
		let attempts = 0;
		while (
			selected.length < nPairs &&
			allNodes.length >= 2 &&
			attempts < maxAttempts
		) {
			attempts++;
			const a = allNodes[Math.floor(rng() * allNodes.length)];
			const b = allNodes[Math.floor(rng() * allNodes.length)];
			if (a === undefined || b === undefined || a === b) continue;
			const [x, y] = canonicalPair(a, b);
			const key = `${x}|${y}`;
			if (seen.has(key)) continue;
			seen.add(key);
			selected.push({
				source: { id: x },
				target: { id: y },
				score: 0,
				support: 0,
				blindVotes: 0,
				components: [],
			});
		}
	}

	return selected.slice(0, nPairs);
}
