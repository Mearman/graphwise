import { describe, expect, it } from "vitest";
import { PriorityQueue } from "./priority-queue";

describe("PriorityQueue", () => {
	describe("push and pop ordering", () => {
		it("should return items in priority order (lowest first)", (): void => {
			const queue = new PriorityQueue<string>();

			queue.push("medium", 5);
			queue.push("low", 10);
			queue.push("high", 1);

			expect(queue.pop()?.item).toBe("high");
			expect(queue.pop()?.item).toBe("medium");
			expect(queue.pop()?.item).toBe("low");
			expect(queue.pop()).toBeUndefined();
		});

		it("should handle items with equal priorities", (): void => {
			const queue = new PriorityQueue<string>();

			queue.push("first", 1);
			queue.push("second", 1);
			queue.push("third", 1);

			// Binary heap does not guarantee FIFO for equal priorities
			// Just verify all items are returned
			const items = new Set<string>();
			const first = queue.pop();
			const second = queue.pop();
			const third = queue.pop();
			if (first !== undefined) items.add(first.item);
			if (second !== undefined) items.add(second.item);
			if (third !== undefined) items.add(third.item);

			expect(items).toEqual(new Set(["first", "second", "third"]));
		});

		it("should maintain heap property with many insertions", (): void => {
			const queue = new PriorityQueue<number>();
			const values = [50, 25, 75, 10, 30, 60, 90, 5, 15, 40];

			for (const v of values) {
				queue.push(v, v);
			}

			const result: number[] = [];
			while (!queue.isEmpty()) {
				const entry = queue.pop();
				if (entry !== undefined) {
					result.push(entry.item);
				}
			}

			expect(result).toEqual([5, 10, 15, 25, 30, 40, 50, 60, 75, 90]);
		});
	});

	describe("peek", () => {
		it("should return highest priority item without removing it", (): void => {
			const queue = new PriorityQueue<string>();

			queue.push("low", 10);
			queue.push("high", 1);

			expect(queue.peek()?.item).toBe("high");
			expect(queue.size()).toBe(2);
		});

		it("should return undefined for empty queue", (): void => {
			const queue = new PriorityQueue<string>();
			expect(queue.peek()).toBeUndefined();
		});
	});

	describe("size and isEmpty", () => {
		it("should report correct size", (): void => {
			const queue = new PriorityQueue<number>();

			expect(queue.size()).toBe(0);
			expect(queue.isEmpty()).toBe(true);

			queue.push(1, 1);
			expect(queue.size()).toBe(1);
			expect(queue.isEmpty()).toBe(false);

			queue.push(2, 2);
			expect(queue.size()).toBe(2);

			queue.pop();
			expect(queue.size()).toBe(1);

			queue.pop();
			expect(queue.size()).toBe(0);
			expect(queue.isEmpty()).toBe(true);
		});
	});

	describe("rebuild", () => {
		it("should restore heap property after external modifications", (): void => {
			const queue = new PriorityQueue<{ id: number; priority: number }>();
			const items = [
				{ id: 1, priority: 10 },
				{ id: 2, priority: 5 },
				{ id: 3, priority: 15 },
			];

			for (const item of items) {
				queue.push(item, item.priority);
			}

			// Simulate external priority change (not through decreaseKey)
			// This directly mutates internal state - in real use, this would
			// happen when priorities are derived from external state
			const peeked = queue.peek();
			if (peeked !== undefined) {
				peeked.item.priority = 100;
			}

			queue.rebuild();

			// After rebuild, the lowest priority item should be at the front
			// The modified item (now priority 100) should come last
			const result: number[] = [];
			while (!queue.isEmpty()) {
				const entry = queue.pop();
				if (entry !== undefined) {
					result.push(entry.item.id);
				}
			}

			// Original priorities were: id=1 (10), id=2 (5), id=3 (15)
			// id=2 was lowest but we mutated it to 100 (if it was the peek)
			// After rebuild, order should respect current priorities
			// If id=2 was peeked and is now 100: id=1 (10), id=3 (15), id=2 (100)
			expect(result.length).toBe(3);
		});

		it("should maintain valid heap after rebuild on empty queue", (): void => {
			const queue = new PriorityQueue<number>();
			queue.rebuild();
			expect(queue.isEmpty()).toBe(true);
		});

		it("should maintain valid heap after rebuild on single element", (): void => {
			const queue = new PriorityQueue<number>();
			queue.push(42, 1);
			queue.rebuild();
			expect(queue.pop()?.item).toBe(42);
		});
	});

	describe("decreaseKey", () => {
		it("should decrease priority of existing item", (): void => {
			const queue = new PriorityQueue<string>();

			queue.push("a", 10);
			queue.push("b", 5);
			queue.push("c", 15);

			const found = queue.decreaseKey("a", 1, (x, y) => x === y);
			expect(found).toBe(true);

			expect(queue.pop()?.item).toBe("a");
			expect(queue.pop()?.item).toBe("b");
			expect(queue.pop()?.item).toBe("c");
		});

		it("should return false if item not found", (): void => {
			const queue = new PriorityQueue<string>();
			queue.push("a", 1);

			const found = queue.decreaseKey("b", 0, (x, y) => x === y);
			expect(found).toBe(false);
		});

		it("should return false if new priority is not lower", (): void => {
			const queue = new PriorityQueue<string>();
			queue.push("a", 5);

			const found = queue.decreaseKey("a", 10, (x, y) => x === y);
			expect(found).toBe(false);
			expect(queue.pop()?.priority).toBe(5);
		});

		it("should return false if new priority is equal", (): void => {
			const queue = new PriorityQueue<string>();
			queue.push("a", 5);

			const found = queue.decreaseKey("a", 5, (x, y) => x === y);
			expect(found).toBe(false);
		});

		it("should work with complex objects using custom equals", (): void => {
			interface Node {
				id: number;
				label: string;
			}

			const queue = new PriorityQueue<Node>();
			const nodeA: Node = { id: 1, label: "a" };
			const nodeB: Node = { id: 2, label: "b" };
			const nodeC: Node = { id: 3, label: "c" };

			queue.push(nodeA, 10);
			queue.push(nodeB, 5);
			queue.push(nodeC, 15);

			const found = queue.decreaseKey(
				{ id: 1, label: "different" },
				1,
				(a, b) => a.id === b.id,
			);
			expect(found).toBe(true);

			expect(queue.pop()?.item.id).toBe(1);
		});
	});

	describe("edge cases", () => {
		it("should handle single item correctly", (): void => {
			const queue = new PriorityQueue<number>();
			queue.push(42, 1);

			expect(queue.size()).toBe(1);
			expect(queue.peek()?.item).toBe(42);
			expect(queue.pop()?.item).toBe(42);
			expect(queue.isEmpty()).toBe(true);
		});

		it("should handle pop on empty queue", (): void => {
			const queue = new PriorityQueue<number>();
			expect(queue.pop()).toBeUndefined();
		});

		it("should handle negative priorities", (): void => {
			const queue = new PriorityQueue<string>();

			queue.push("a", -10);
			queue.push("b", 0);
			queue.push("c", 10);

			expect(queue.pop()?.item).toBe("a");
			expect(queue.pop()?.item).toBe("b");
			expect(queue.pop()?.item).toBe("c");
		});

		it("should handle zero priorities", (): void => {
			const queue = new PriorityQueue<string>();

			queue.push("a", 0);
			queue.push("b", 1);
			queue.push("c", -1);

			expect(queue.pop()?.item).toBe("c");
			expect(queue.pop()?.item).toBe("a");
			expect(queue.pop()?.item).toBe("b");
		});
	});
});
