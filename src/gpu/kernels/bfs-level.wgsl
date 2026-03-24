/**
 * Level-Synchronous BFS compute shader.
 *
 * Expands one level of BFS frontier in parallel. Each level corresponds
 * to one dispatch of this kernel.
 *
 * Used by: BFS traversal, expansion algorithms, shortest path
 *
 * Bind groups:
 * - 0: CSR matrix { row_offsets, col_indices }
 * - 1: { frontier: Uint32Array, visited: Uint32Array, next_frontier: Uint32Array, levels: Uint32Array }
 * - 2: { current_level: u32, frontier_size: u32, n: u32 }
 *
 * Dispatch: frontier_size threads (one per frontier node)
 */

struct BFSParams {
  n: u32,                    // Number of nodes
  current_level: u32,        // Current BFS level (distance from source)
  frontier_size: u32,        // Number of nodes in current frontier
  padding: u32,
}

struct BFSCounters {
  next_frontier_size: atomic<u32>,
}

@group(0) @binding(0) var<storage, read> row_offsets: array<u32>;
@group(0) @binding(1) var<storage, read> col_indices: array<u32>;

@group(1) @binding(0) var<storage, read> frontier: array<u32>;
@group(1) @binding(1) var<storage, read> visited: array<u32>;
@group(1) @binding(2) var<storage, read_write> next_frontier: array<u32>;
@group(1) @binding(3) var<storage, read_write> levels: array<u32>;

@group(2) @binding(0) var<uniform> params: BFSParams;
@group(2) @binding(1) var<storage, read_write> counters: BFSCounters;

const WORKGROUP_SIZE: u32 = 256u;

@compute @workgroup_size(WORKGROUP_SIZE)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let frontier_idx = global_id.x;
  if (frontier_idx >= params.frontier_size) {
    return;
  }

  let node = frontier[frontier_idx];
  let start = row_offsets[node];
  let end = row_offsets[node + 1u];

  for (var i = start; i < end; i = i + 1u) {
    let neighbour = col_indices[i];

    // Try to mark as visited using atomic compare-exchange
    // If we successfully set it from 0 to 1, it's newly discovered
    let prev = atomicCompareExchangeWeak(&visited[neighbour], 0u, 1u);
    if (prev.old_value == 0u) {
      // Add to next frontier
      let next_idx = atomicAdd(&counters.next_frontier_size, 1u);
      next_frontier[next_idx] = neighbour;
      levels[neighbour] = params.current_level + 1u;
    }
  }
}
