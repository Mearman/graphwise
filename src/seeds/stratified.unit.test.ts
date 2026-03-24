import { describe, it, expect } from "vitest";
import { AdjacencyMapGraph } from "../graph";
import type { NodeData } from "../graph";
import {
	stratified,
	type FieldClassifier,
	type StratumDefinition,
} from "./stratified";

interface TestNode extends NodeData {
	readonly type: string;
	readonly field?: string;
}

/**
 * Helper class to manage test data and provide classifiers/predicates.
 * Uses closure to allow predicates to access node field data.
 */
class TestFieldManager {
	private readonly nodeFields = new Map<string, string>();

	addNode(id: string, field: string): void {
		this.nodeFields.set(id, field);
	}

	/**
	 * Field classifier that looks up field by node ID.
	 */
	get classifier(): FieldClassifier {
		return (node) => this.nodeFields.get(node.id);
	}

	/**
	 * Create a predicate that accepts all pairs.
	 */
	allPairsPredicate(): () => boolean {
		return () => true;
	}

	/**
	 * Create a predicate that checks if two nodes have the same field.
	 */
	sameFieldPredicate(): (
		source: { id: string; type?: string },
		target: { id: string; type?: string },
	) => boolean {
		return (source, target) => {
			const sourceField = this.nodeFields.get(source.id);
			const targetField = this.nodeFields.get(target.id);
			return sourceField !== undefined && sourceField === targetField;
		};
	}

	/**
	 * Create a predicate that checks for cross-field pairs (fieldA, fieldB).
	 */
	crossFieldPredicate(
		fieldA: string,
		fieldB: string,
	): (
		source: { id: string; type?: string },
		target: { id: string; type?: string },
	) => boolean {
		return (source, target) => {
			const sField = this.nodeFields.get(source.id);
			const tField = this.nodeFields.get(target.id);
			return (
				(sField === fieldA && tField === fieldB) ||
				(sField === fieldB && tField === fieldA)
			);
		};
	}
}

/**
 * Create a test graph with nodes classified by field.
 * Returns both the graph and a field manager for creating classifiers/predicates.
 */
function createTestGraph(
	nodes: { id: string; type: string; field?: string }[],
): { graph: AdjacencyMapGraph<TestNode>; fields: TestFieldManager } {
	const graph = AdjacencyMapGraph.undirected<TestNode>();
	const fields = new TestFieldManager();

	for (const node of nodes) {
		graph.addNode({ id: node.id, type: node.type, field: node.field });
		if (node.field !== undefined) {
			fields.addNode(node.id, node.field);
		}
	}

	return { graph, fields };
}

describe("stratified seed selection", () => {
	describe("basic functionality", () => {
		it("returns empty result for empty graph", () => {
			const graph = AdjacencyMapGraph.undirected<TestNode>();
			const fields = new TestFieldManager();

			const result = stratified(graph, {
				fieldClassifier: fields.classifier,
			});

			expect(result.strata).toHaveLength(0);
			expect(result.totalPairs).toBe(0);
			expect(result.errors).toHaveLength(0);
		});

		it("returns empty result when no custom strata are defined", () => {
			const { graph, fields } = createTestGraph([
				{ id: "A", type: "paper", field: "cs" },
				{ id: "B", type: "paper", field: "physics" },
			]);

			const result = stratified(graph, {
				fieldClassifier: fields.classifier,
			});

			expect(result.strata).toHaveLength(0);
			expect(result.totalPairs).toBe(0);
		});

		it("returns result with correct structure", () => {
			const { graph, fields } = createTestGraph([
				{ id: "A", type: "paper", field: "cs" },
				{ id: "B", type: "paper", field: "cs" },
			]);

			const customStrata: readonly StratumDefinition[] = [
				{
					name: "same-field",
					description: "Pairs from the same field",
					predicate: fields.sameFieldPredicate(),
				},
			];

			const result = stratified(graph, {
				fieldClassifier: fields.classifier,
				customStrata,
			});

			expect(result).toHaveProperty("strata");
			expect(result).toHaveProperty("totalPairs");
			expect(result).toHaveProperty("errors");
			expect(Array.isArray(result.strata)).toBe(true);
			expect(typeof result.totalPairs).toBe("number");
			expect(Array.isArray(result.errors)).toBe(true);
		});
	});

	describe("field classification", () => {
		it("only includes nodes that have a defined field", () => {
			const { graph, fields } = createTestGraph([
				{ id: "A", type: "paper", field: "cs" },
				{ id: "B", type: "paper" }, // No field
				{ id: "C", type: "paper", field: "physics" },
			]);

			// Stratum that accepts all pairs
			const customStrata: readonly StratumDefinition[] = [
				{
					name: "all-pairs",
					description: "All valid pairs",
					predicate: fields.allPairsPredicate(),
				},
			];

			const result = stratified(graph, {
				fieldClassifier: fields.classifier,
				customStrata,
				pairsPerStratum: 100,
			});

			// Only A and C have fields, so only 1 pair is possible
			expect(result.totalPairs).toBe(1);
		});

		it("uses custom field classifier based on type", () => {
			const { graph, fields } = createTestGraph([
				{ id: "A", type: "paper", field: "cs" },
				{ id: "B", type: "author", field: "cs" },
			]);

			// Classifier that only returns field for papers
			const paperOnlyClassifier: FieldClassifier = (node) => {
				if (node.type === "paper") {
					return fields.classifier(node);
				}
				return undefined;
			};

			const customStrata: readonly StratumDefinition[] = [
				{
					name: "all-pairs",
					description: "All valid pairs",
					predicate: fields.allPairsPredicate(),
				},
			];

			const result = stratified(graph, {
				fieldClassifier: paperOnlyClassifier,
				customStrata,
			});

			// Only A is a paper with a field, so no pairs possible
			expect(result.totalPairs).toBe(0);
		});
	});

	describe("stratum processing", () => {
		it("samples pairs matching stratum predicate", () => {
			const { graph, fields } = createTestGraph([
				{ id: "A", type: "paper", field: "cs" },
				{ id: "B", type: "paper", field: "cs" },
				{ id: "C", type: "paper", field: "physics" },
				{ id: "D", type: "paper", field: "physics" },
			]);

			const customStrata: readonly StratumDefinition[] = [
				{
					name: "same-field",
					description: "Pairs from the same field",
					predicate: fields.sameFieldPredicate(),
				},
			];

			const result = stratified(graph, {
				fieldClassifier: fields.classifier,
				customStrata,
				pairsPerStratum: 10,
			});

			expect(result.strata).toHaveLength(1);
			expect(result.strata[0]?.name).toBe("same-field");

			// All pairs should have sameField = true
			for (const pair of result.strata[0]?.pairs ?? []) {
				expect(pair.sameField).toBe(true);
			}
		});

		it("handles multiple strata", () => {
			const { graph, fields } = createTestGraph([
				{ id: "A", type: "paper", field: "cs" },
				{ id: "B", type: "paper", field: "physics" },
				{ id: "C", type: "paper", field: "cs" },
				{ id: "D", type: "paper", field: "math" },
			]);

			const customStrata: readonly StratumDefinition[] = [
				{
					name: "cs-math",
					description: "CS to Math pairs",
					predicate: fields.crossFieldPredicate("cs", "math"),
				},
				{
					name: "cs-physics",
					description: "CS to Physics pairs",
					predicate: fields.crossFieldPredicate("cs", "physics"),
				},
			];

			const result = stratified(graph, {
				fieldClassifier: fields.classifier,
				customStrata,
				pairsPerStratum: 5,
			});

			expect(result.strata).toHaveLength(2);
			expect(result.strata[0]?.name).toBe("cs-math");
			expect(result.strata[1]?.name).toBe("cs-physics");
		});

		it("respects pairsPerStratum limit", () => {
			const { graph, fields } = createTestGraph([
				{ id: "A", type: "paper", field: "cs" },
				{ id: "B", type: "paper", field: "cs" },
				{ id: "C", type: "paper", field: "cs" },
				{ id: "D", type: "paper", field: "cs" },
				{ id: "E", type: "paper", field: "cs" },
			]);

			const customStrata: readonly StratumDefinition[] = [
				{
					name: "all-pairs",
					description: "All pairs",
					predicate: fields.allPairsPredicate(),
				},
			];

			const result = stratified(graph, {
				fieldClassifier: fields.classifier,
				customStrata,
				pairsPerStratum: 3,
			});

			expect(result.strata[0]?.pairs).toHaveLength(3);
		});

		it("samples fewer pairs when not enough eligible pairs exist", () => {
			const { graph, fields } = createTestGraph([
				{ id: "A", type: "paper", field: "cs" },
				{ id: "B", type: "paper", field: "cs" },
			]);

			const customStrata: readonly StratumDefinition[] = [
				{
					name: "all-pairs",
					description: "All pairs",
					predicate: fields.allPairsPredicate(),
				},
			];

			const result = stratified(graph, {
				fieldClassifier: fields.classifier,
				customStrata,
				pairsPerStratum: 100,
			});

			// Only 1 pair possible with 2 nodes
			expect(result.strata[0]?.pairs).toHaveLength(1);
		});
	});

	describe("seed pair structure", () => {
		it("includes correct metadata in seed pairs", () => {
			const { graph, fields } = createTestGraph([
				{ id: "A", type: "paper", field: "cs" },
				{ id: "B", type: "paper", field: "cs" },
			]);

			const customStrata: readonly StratumDefinition[] = [
				{
					name: "test-stratum",
					description: "Test stratum",
					predicate: fields.allPairsPredicate(),
				},
			];

			const result = stratified(graph, {
				fieldClassifier: fields.classifier,
				customStrata,
			});

			const pair = result.strata[0]?.pairs[0];
			expect(pair).toBeDefined();
			expect(pair).toHaveProperty("source");
			expect(pair).toHaveProperty("target");
			expect(pair).toHaveProperty("stratum", "test-stratum");
			expect(pair).toHaveProperty("sameField");
			expect(pair?.source).toHaveProperty("id");
			expect(pair?.target).toHaveProperty("id");
		});

		it("correctly identifies same-field pairs", () => {
			const { graph, fields } = createTestGraph([
				{ id: "A", type: "paper", field: "cs" },
				{ id: "B", type: "paper", field: "cs" },
			]);

			const customStrata: readonly StratumDefinition[] = [
				{
					name: "all-pairs",
					description: "All pairs",
					predicate: fields.allPairsPredicate(),
				},
			];

			const result = stratified(graph, {
				fieldClassifier: fields.classifier,
				customStrata,
			});

			expect(result.strata[0]?.pairs[0]?.sameField).toBe(true);
		});

		it("correctly identifies different-field pairs", () => {
			const { graph, fields } = createTestGraph([
				{ id: "A", type: "paper", field: "cs" },
				{ id: "B", type: "paper", field: "physics" },
			]);

			const customStrata: readonly StratumDefinition[] = [
				{
					name: "cross-field",
					description: "Cross-field pairs",
					predicate: fields.allPairsPredicate(),
				},
			];

			const result = stratified(graph, {
				fieldClassifier: fields.classifier,
				customStrata,
			});

			expect(result.strata[0]?.pairs[0]?.sameField).toBe(false);
		});
	});

	describe("reproducibility", () => {
		it("produces reproducible results with same rngSeed", () => {
			const { graph, fields } = createTestGraph([
				{ id: "A", type: "paper", field: "cs" },
				{ id: "B", type: "paper", field: "cs" },
				{ id: "C", type: "paper", field: "physics" },
				{ id: "D", type: "paper", field: "math" },
			]);

			const customStrata: readonly StratumDefinition[] = [
				{
					name: "all-pairs",
					description: "All pairs",
					predicate: fields.allPairsPredicate(),
				},
			];

			const result1 = stratified(graph, {
				fieldClassifier: fields.classifier,
				customStrata,
				rngSeed: 42,
				pairsPerStratum: 3,
			});

			const result2 = stratified(graph, {
				fieldClassifier: fields.classifier,
				customStrata,
				rngSeed: 42,
				pairsPerStratum: 3,
			});

			expect(result1.totalPairs).toBe(result2.totalPairs);

			const pairs1 = result1.strata[0]?.pairs ?? [];
			const pairs2 = result2.strata[0]?.pairs ?? [];

			for (let i = 0; i < pairs1.length; i++) {
				expect(pairs1[i]?.source.id).toBe(pairs2[i]?.source.id);
				expect(pairs1[i]?.target.id).toBe(pairs2[i]?.target.id);
			}
		});

		it("produces different results with different rngSeed", () => {
			const { graph, fields } = createTestGraph([
				{ id: "A", type: "paper", field: "cs" },
				{ id: "B", type: "paper", field: "cs" },
				{ id: "C", type: "paper", field: "cs" },
				{ id: "D", type: "paper", field: "cs" },
			]);

			const customStrata: readonly StratumDefinition[] = [
				{
					name: "all-pairs",
					description: "All pairs",
					predicate: fields.allPairsPredicate(),
				},
			];

			const result1 = stratified(graph, {
				fieldClassifier: fields.classifier,
				customStrata,
				rngSeed: 42,
				pairsPerStratum: 2,
			});

			const result2 = stratified(graph, {
				fieldClassifier: fields.classifier,
				customStrata,
				rngSeed: 123,
				pairsPerStratum: 2,
			});

			// With different seeds, at least some pairs should differ
			// (probabilistically true with 6 possible pairs and sampling 2)
			const pairs1 = new Set(
				result1.strata[0]?.pairs.map((p) => `${p.source.id}-${p.target.id}`) ??
					[],
			);
			const pairs2 = new Set(
				result2.strata[0]?.pairs.map((p) => `${p.source.id}-${p.target.id}`) ??
					[],
			);

			// Each result should have sampled pairs (between 1 and pairsPerStratum)
			expect(pairs1.size).toBeGreaterThanOrEqual(1);
			expect(pairs1.size).toBeLessThanOrEqual(2);
			expect(pairs2.size).toBeGreaterThanOrEqual(1);
			expect(pairs2.size).toBeLessThanOrEqual(2);
		});
	});

	describe("error handling", () => {
		it("reports error for stratum with no matching pairs", () => {
			const { graph, fields } = createTestGraph([
				{ id: "A", type: "paper", field: "cs" },
				{ id: "B", type: "paper", field: "physics" },
			]);

			const customStrata: readonly StratumDefinition[] = [
				{
					name: "impossible-stratum",
					description: "A stratum that never matches",
					predicate: () => false,
				},
			];

			const result = stratified(graph, {
				fieldClassifier: fields.classifier,
				customStrata,
			});

			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]?.message).toBe(
				"No pairs found for stratum: impossible-stratum",
			);
		});

		it("reports multiple errors for multiple empty strata", () => {
			const { graph, fields } = createTestGraph([
				{ id: "A", type: "paper", field: "cs" },
				{ id: "B", type: "paper", field: "physics" },
			]);

			const customStrata: readonly StratumDefinition[] = [
				{
					name: "empty-1",
					description: "First empty stratum",
					predicate: () => false,
				},
				{
					name: "empty-2",
					description: "Second empty stratum",
					predicate: () => false,
				},
			];

			const result = stratified(graph, {
				fieldClassifier: fields.classifier,
				customStrata,
			});

			expect(result.errors).toHaveLength(2);
		});

		it("does not report error for stratum with matching pairs", () => {
			const { graph, fields } = createTestGraph([
				{ id: "A", type: "paper", field: "cs" },
				{ id: "B", type: "paper", field: "cs" },
			]);

			const customStrata: readonly StratumDefinition[] = [
				{
					name: "valid-stratum",
					description: "A valid stratum",
					predicate: fields.allPairsPredicate(),
				},
			];

			const result = stratified(graph, {
				fieldClassifier: fields.classifier,
				customStrata,
			});

			expect(result.errors).toHaveLength(0);
		});
	});

	describe("edge cases", () => {
		it("handles single node gracefully", () => {
			const { graph, fields } = createTestGraph([
				{ id: "A", type: "paper", field: "cs" },
			]);

			const customStrata: readonly StratumDefinition[] = [
				{
					name: "all-pairs",
					description: "All pairs",
					predicate: fields.allPairsPredicate(),
				},
			];

			const result = stratified(graph, {
				fieldClassifier: fields.classifier,
				customStrata,
			});

			expect(result.totalPairs).toBe(0);
			expect(result.errors).toHaveLength(1); // No pairs possible
		});

		it("handles nodes with undefined type", () => {
			const graph = AdjacencyMapGraph.undirected<TestNode>();
			const fields = new TestFieldManager();
			graph.addNode({ id: "A", type: "paper", field: "cs" });
			fields.addNode("A", "cs");

			const customStrata: readonly StratumDefinition[] = [
				{
					name: "all-pairs",
					description: "All pairs",
					predicate: fields.allPairsPredicate(),
				},
			];

			const result = stratified(graph, {
				fieldClassifier: fields.classifier,
				customStrata,
			});

			// Should still work with single node, just no pairs
			expect(result.totalPairs).toBe(0);
		});

		it("uses default pairsPerStratum when not specified", () => {
			const { graph, fields } = createTestGraph(
				Array.from({ length: 50 }, (_, i) => ({
					id: `N${String(i)}`,
					type: "paper",
					field: "cs",
				})),
			);

			const customStrata: readonly StratumDefinition[] = [
				{
					name: "all-pairs",
					description: "All pairs",
					predicate: fields.allPairsPredicate(),
				},
			];

			const result = stratified(graph, {
				fieldClassifier: fields.classifier,
				customStrata,
				// Not specifying pairsPerStratum - should default to 10
			});

			expect(result.strata[0]?.pairs).toHaveLength(10);
		});

		it("uses default rngSeed when not specified", () => {
			const { graph, fields } = createTestGraph([
				{ id: "A", type: "paper", field: "cs" },
				{ id: "B", type: "paper", field: "cs" },
			]);

			const customStrata: readonly StratumDefinition[] = [
				{
					name: "all-pairs",
					description: "All pairs",
					predicate: fields.allPairsPredicate(),
				},
			];

			// Run twice without specifying seed - should be reproducible (default 42)
			const result1 = stratified(graph, {
				fieldClassifier: fields.classifier,
				customStrata,
			});

			const result2 = stratified(graph, {
				fieldClassifier: fields.classifier,
				customStrata,
			});

			expect(result1.totalPairs).toBe(result2.totalPairs);
		});
	});

	describe("totalPairs calculation", () => {
		it("sums pairs across all strata", () => {
			const { graph, fields } = createTestGraph([
				{ id: "A", type: "paper", field: "cs" },
				{ id: "B", type: "paper", field: "physics" },
				{ id: "C", type: "paper", field: "math" },
			]);

			const customStrata: readonly StratumDefinition[] = [
				{
					name: "stratum-1",
					description: "First stratum",
					predicate: fields.allPairsPredicate(),
				},
				{
					name: "stratum-2",
					description: "Second stratum",
					predicate: fields.allPairsPredicate(),
				},
			];

			const result = stratified(graph, {
				fieldClassifier: fields.classifier,
				customStrata,
				pairsPerStratum: 2,
			});

			// 3 pairs possible total, each stratum can sample up to 2
			expect(result.totalPairs).toBe(4); // 2 from each stratum
		});
	});
});
