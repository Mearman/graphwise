/**
 * Utility functions module.
 *
 * @packageDocumentation
 */

export {
	localClusteringCoefficient,
	approximateClusteringCoefficient,
	batchClusteringCoefficients,
} from "./clustering-coefficient";

export {
	miniBatchKMeans,
	normaliseFeatures,
	zScoreNormalise,
	type FeatureVector3D,
	type LabelledFeature,
	type KMeansResult,
	type KMeansOptions,
} from "./kmeans";

export {
	shannonEntropy,
	normalisedEntropy,
	entropyFromCounts,
	localTypeEntropy,
} from "./entropy";
