/**
 * Sparse Matrix-Vector Multiplication (SpMV) compute shader.
 *
 * Computes y = A * x where A is a sparse CSR matrix.
 *
 * Used by: PageRank, Katz Index, Communicability
 *
 * Bind groups:
 * - 0: { row_offsets: Uint32Array, col_indices: Uint32Array, values: Float32Array? }
 * - 1: { x: Float32Array, y: Float32Array, n: u32 }
 *
 * Dispatch: 1 workgroup per row (ceil(nodeCount / WORKGROUP_SIZE))
 */

struct SpMVParams {
  n: u32,           // Number of rows/nodes
  has_values: u32,  // 1 if values array present, 0 for unweighted
  padding: vec2<u32>,
}

@group(0) @binding(0) var<storage, read> row_offsets: array<u32>;
@group(0) @binding(1) var<storage, read> col_indices: array<u32>;
@group(0) @binding(2) var<storage, read> values: array<f32>;
@group(0) @binding(3) var<uniform> params: SpMVParams;

@group(1) @binding(0) var<storage, read> x: array<f32>;
@group(1) @binding(1) var<storage, read_write> y: array<f32>;

const WORKGROUP_SIZE: u32 = 256u;

@compute @workgroup_size(WORKGROUP_SIZE)
fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
  let row = global_id.x;
  if (row >= params.n) {
    return;
  }

  let start = row_offsets[row];
  let end = row_offsets[row + 1u];

  var sum: f32 = 0.0;

  for (var i = start; i < end; i = i + 1u) {
    let col = col_indices[i];
    let weight = select(1.0, values[i], params.has_values == 1u);
    sum = sum + weight * x[col];
  }

  y[row] = sum;
}
