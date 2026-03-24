/**
 * Batch Jaccard Similarity compute shader.
 *
 * Computes Jaccard coefficient for multiple node pairs in parallel:
 *   J(u, v) = |N(u) intersect N(v)| / |N(u) union N(v)|
 *
 * Used by: All MI variants, PARSE ranking
 *
 * Bind groups:
 * - 0: CSR matrix { row_offsets, col_indices }
 * - 1: { pairs: vec2<u32> array, results: Float32Array, pair_count: u32 }
 * - 2: { scratch: u32 array for intersection computation }
 *
 * Dispatch: 1 thread per pair (ceil(pair_count / WORKGROUP_SIZE))
 */

struct JaccardParams {
  pair_count: u32,  // Number of pairs to compute
  padding: vec3<u32>,
}

struct NodePair {
  u: u32,
  v: u32,
}

@group(0) @binding(0) var<storage, read> row_offsets: array<u32>;
@group(0) @binding(1) var<storage, read> col_indices: array<u32>;

@group(1) @binding(0) var<storage, read> pairs: array<NodePair>;
@group(1) @binding(1) var<storage, read_write> results: array<f32>;

@group(2) @binding(0) var<uniform> params: JaccardParams;

const WORKGROUP_SIZE: u32 = 256u;

// Binary search for intersection
fn contains(col_indices: array<u32>, start: u32, end: u32, target: u32) -> bool {
  var lo = start;
  var hi = end;

  while (lo < hi) {
    let mid = lo + (hi - lo) / 2u;
    if (col_indices[mid] == target) {
      return true;
    } else if (col_indices[mid] < target) {
      lo = mid + 1u;
    } else {
      hi = mid;
    }
  }

  return false;
}

@compute @workgroup_size(WORKGROUP_SIZE)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let pair_idx = global_id.x;
  if (pair_idx >= params.pair_count) {
    return;
  }

  let pair = pairs[pair_idx];
  let u = pair.u;
  let v = pair.v;

  // Get neighbourhood bounds
  let u_start = row_offsets[u];
  let u_end = row_offsets[u + 1u];
  let v_start = row_offsets[v];
  let v_end = row_offsets[v + 1u];

  let deg_u = u_end - u_start;
  let deg_v = v_end - v_start;

  // Empty neighbourhoods -> Jaccard = 0
  if (deg_u == 0u || deg_v == 0u) {
    results[pair_idx] = 0.0;
    return;
  }

  // Count intersection by iterating smaller neighbourhood
  var intersection: u32 = 0u;

  if (deg_u <= deg_v) {
    // Iterate u's neighbours, search in v's
    for (var i = u_start; i < u_end; i = i + 1u) {
      if (contains(col_indices, v_start, v_end, col_indices[i])) {
        intersection = intersection + 1u;
      }
    }
  } else {
    // Iterate v's neighbours, search in u's
    for (var i = v_start; i < v_end; i = i + 1u) {
      if (contains(col_indices, u_start, u_end, col_indices[i])) {
        intersection = intersection + 1u;
      }
    }
  }

  // Jaccard = intersection / union
  let union_size = deg_u + deg_v - intersection;
  results[pair_idx] = f32(intersection) / f32(union_size);
}
