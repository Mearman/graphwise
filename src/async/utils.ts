/**
 * Async utility functions.
 *
 * @module async/utils
 */

/** Collect an AsyncIterable into a readonly array. */
export async function collectAsyncIterable<T>(
	iter: AsyncIterable<T>,
): Promise<readonly T[]> {
	const result: T[] = [];
	for await (const item of iter) result.push(item);
	return result;
}

/** Default yield strategy: setTimeout(0) to yield to the event loop. */
export function defaultYieldStrategy(): Promise<void> {
	return new Promise((r) => {
		setTimeout(r, 0);
	});
}
