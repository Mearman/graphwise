/**
 * Entropy computation utilities for graph analysis.
 *
 * Shannon entropy measures uncertainty or randomness in a distribution.
 * Used in EDGE and HAE algorithms for heterogeneity-aware exploration.
 *
 * @packageDocumentation
 */

/**
 * Compute Shannon entropy of a probability distribution.
 *
 * Shannon entropy is defined as:
 *   H(X) = -Σ p(x) × log₂(p(x))
 *
 * A uniform distribution has maximum entropy.
 * A deterministic distribution (all probability on one value) has zero entropy.
 *
 * @param probabilities - Array of probabilities (should sum to 1)
 * @returns Entropy in bits (log base 2), or 0 if probabilities are invalid
 */
export function shannonEntropy(probabilities: readonly number[]): number {
	if (probabilities.length === 0) {
		return 0;
	}

	let entropy = 0;
	for (const p of probabilities) {
		// Skip zero probabilities (log(0) is undefined, but 0 * log(0) = 0)
		if (p > 0) {
			entropy -= p * Math.log2(p);
		}
	}

	return entropy;
}

/**
 * Compute normalised entropy (entropy divided by maximum possible entropy).
 *
 * Normalised entropy is in [0, 1], where:
 * - 0 means the distribution is deterministic (all mass on one value)
 * - 1 means the distribution is uniform (maximum uncertainty)
 *
 * This is useful for comparing entropy across distributions with different
 * numbers of possible values.
 *
 * @param probabilities - Array of probabilities (should sum to 1)
 * @returns Normalised entropy in [0, 1], or 0 if only one category
 */
export function normalisedEntropy(probabilities: readonly number[]): number {
	if (probabilities.length <= 1) {
		return 0;
	}

	const H = shannonEntropy(probabilities);
	const Hmax = Math.log2(probabilities.length);

	if (Hmax === 0) {
		return 0;
	}

	return H / Hmax;
}

/**
 * Compute entropy from a frequency count.
 *
 * Converts counts to probabilities and then computes entropy.
 * This is a convenience function when you have raw counts rather than
 * normalised probabilities.
 *
 * @param counts - Array of frequency counts
 * @returns Entropy in bits
 */
export function entropyFromCounts(counts: readonly number[]): number {
	if (counts.length === 0) {
		return 0;
	}

	const total = counts.reduce((sum, c) => sum + c, 0);
	if (total === 0) {
		return 0;
	}

	const probabilities = counts.map((c) => c / total);
	return shannonEntropy(probabilities);
}

/**
 * Compute local type entropy for a node's neighbours.
 *
 * This measures the diversity of types among a node's neighbours.
 * High entropy = heterogeneous neighbourhood (diverse types).
 * Low entropy = homogeneous neighbourhood (similar types).
 *
 * @param neighbourTypes - Array of type labels for neighbours
 * @returns Normalised entropy in [0, 1]
 */
export function localTypeEntropy(neighbourTypes: readonly string[]): number {
	if (neighbourTypes.length <= 1) {
		return 0;
	}

	// Count occurrences of each type
	const typeCounts = new Map<string, number>();
	for (const t of neighbourTypes) {
		typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
	}

	// If all neighbours are the same type, entropy is 0
	if (typeCounts.size === 1) {
		return 0;
	}

	// Convert to probability array
	const probabilities: number[] = [];
	const total = neighbourTypes.length;
	for (const count of typeCounts.values()) {
		probabilities.push(count / total);
	}

	return normalisedEntropy(probabilities);
}
