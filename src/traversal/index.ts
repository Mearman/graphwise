/**
 * Graph traversal algorithms module.
 *
 * Provides lazy, generator-based implementations of common graph traversal
 * algorithms for memory-efficient processing of large graphs.
 *
 * @module traversal
 */

export { bfs, bfsWithPath, type BfsPathEntry } from "./bfs";
export { dfs, dfsWithPath, type DfsPathEntry } from "./dfs";
