/**
 * PageRank Power Iteration compute shader.
 *
 * Performs one iteration of PageRank:
 *   r(v) = (1 - d)/N + d * sum(r(u) / deg_out(u)) for u -> v
 *
 * Used by: PageRank baseline, GRASP approximate PageRank
 *
 * Bind groups:
 * - 0: CSR matrix { row_offsets, col_indices }
 * - 1: { ranks: Float32Array, out_degrees: Uint32Array, new_ranks: Float32Array }
 * - 2: { damping: f32, n: u32 }
 *
 * Dispatch: 1 workgroup per node
 */

struct PageRankParams {
  n: u32,           // Number of nodes
  damping: f32,     // Damping factor (typically 0.85)
  padding: vec2<u32>,
}

@group(0) @binding(0) var<storage, read> row_offsets: array<u32>;
@group(0) @binding(1) var<storage, read> col_indices: array<u32>;

@group(1) @binding(0) var<storage, read> ranks: array<f32>;
@group(1) @binding(1) var<storage, read> out_degrees: array<u32>;
@group(1) @binding(2) var<storage, read_write> new_ranks: array<f32>;

@group(2) @binding(0) var<uniform> params: PageRankParams;

const WORKGROUP_SIZE: u32 = 256u;

@compute @workgroup_size(WORKGROUP_SIZE)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let node = global_id.x;
  if (node >= params.n) {
    return;
  }

  // Compute contribution from incoming edges
  let start = row_offsets[node];
  let end = row_offsets[node + 1u];

  var contribution: f32 = 0.0;

  for (var i = start; i < end; i = i + 1u) {
    let source = col_indices[i];
    let deg = out_degrees[source];
    if (deg > 0u) {
      contribution = contribution + ranks[source] / f32(deg);
    }
  }

  // Apply damping and random teleport
  let teleport = (1.0 - params.damping) / f32(params.n);
  new_ranks[node] = teleport + params.damping * contribution;
}
