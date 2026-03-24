/**
 * Priority queue entry containing an item and its priority.
 */
export interface PriorityEntry<T> {
	item: T;
	priority: number;
}

/**
 * Min-heap priority queue implementation using an array-based binary heap.
 * Lower priority values have higher precedence (extracted first).
 */
export class PriorityQueue<T> {
	private heap: PriorityEntry<T>[] = [];

	/**
	 * Returns the number of items in the queue.
	 */
	public size(): number {
		return this.heap.length;
	}

	/**
	 * Returns true if the queue is empty.
	 */
	public isEmpty(): boolean {
		return this.heap.length === 0;
	}

	/**
	 * Adds an item with the given priority to the queue.
	 */
	public push(item: T, priority: number): void {
		const entry: PriorityEntry<T> = { item, priority };
		this.heap.push(entry);
		this.heapifyUp(this.heap.length - 1);
	}

	/**
	 * Removes and returns the highest precedence item (lowest priority value).
	 * Returns undefined if the queue is empty.
	 */
	public pop(): PriorityEntry<T> | undefined {
		if (this.heap.length === 0) {
			return undefined;
		}

		const root = this.heap[0];
		if (root === undefined) {
			return undefined;
		}

		const last = this.heap.pop();
		if (last === undefined) {
			return root;
		}

		if (this.heap.length > 0) {
			this.heap[0] = last;
			this.heapifyDown(0);
		}

		return root;
	}

	/**
	 * Returns the highest precedence item without removing it.
	 * Returns undefined if the queue is empty.
	 */
	public peek(): PriorityEntry<T> | undefined {
		return this.heap[0];
	}

	/**
	 * Rebuilds the heap from the current array state.
	 * Useful when priorities have been modified externally (e.g., phase transitions).
	 */
	public rebuild(): void {
		// Floyd's algorithm: heapify down from last non-leaf to root
		const start = Math.floor(this.heap.length / 2) - 1;
		for (let i = start; i >= 0; i--) {
			this.heapifyDown(i);
		}
	}

	/**
	 * Decreases the priority of an existing item in the queue.
	 * Returns true if the item was found and updated, false otherwise.
	 *
	 * @param item - The item to find
	 * @param newPriority - The new (lower) priority value
	 * @param equals - Function to compare items for equality
	 */
	public decreaseKey(
		item: T,
		newPriority: number,
		equals: (a: T, b: T) => boolean,
	): boolean {
		let foundIndex = -1;

		for (let i = 0; i < this.heap.length; i++) {
			const entry = this.heap[i];
			if (entry !== undefined && equals(entry.item, item)) {
				foundIndex = i;
				break;
			}
		}

		if (foundIndex === -1) {
			return false;
		}

		const entry = this.heap[foundIndex];
		if (entry === undefined) {
			return false;
		}

		// Only update if new priority is lower (higher precedence)
		if (newPriority >= entry.priority) {
			return false;
		}

		entry.priority = newPriority;
		this.heapifyUp(foundIndex);
		return true;
	}

	/**
	 * Restores heap property by moving element up from given index.
	 */
	private heapifyUp(index: number): void {
		let current = index;

		while (current > 0) {
			const parent = Math.floor((current - 1) / 2);
			const currentEntry = this.heap[current];
			const parentEntry = this.heap[parent];

			if (currentEntry === undefined || parentEntry === undefined) {
				return;
			}

			if (currentEntry.priority >= parentEntry.priority) {
				return;
			}

			// Swap current and parent
			this.heap[current] = parentEntry;
			this.heap[parent] = currentEntry;
			current = parent;
		}
	}

	/**
	 * Restores heap property by moving element down from given index.
	 */
	private heapifyDown(index: number): void {
		let current = index;
		const length = this.heap.length;

		while (current < length) {
			const left = 2 * current + 1;
			const right = 2 * current + 2;
			let smallest = current;

			const currentEntry = this.heap[current];
			if (currentEntry === undefined) {
				return;
			}

			// Compare with left child
			const leftEntry = this.heap[left];
			if (
				left < length &&
				leftEntry !== undefined &&
				leftEntry.priority < currentEntry.priority
			) {
				smallest = left;
			}

			// Compare with right child (need to re-fetch smallest after potential update)
			const rightEntry = this.heap[right];
			const currentSmallestEntry = this.heap[smallest];
			if (
				right < length &&
				rightEntry !== undefined &&
				currentSmallestEntry !== undefined &&
				rightEntry.priority < currentSmallestEntry.priority
			) {
				smallest = right;
			}

			if (smallest === current) {
				return;
			}

			// Get the final smallest entry (after determining final smallest index)
			const finalSmallestEntry = this.heap[smallest];
			if (finalSmallestEntry !== undefined) {
				this.heap[current] = finalSmallestEntry;
				this.heap[smallest] = currentEntry;
				current = smallest;
			} else {
				return;
			}
		}
	}
}
