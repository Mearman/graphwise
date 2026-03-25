// Smoke test: verify all export paths are accessible
import * as graphwise from "graphwise";
import * as graph from "graphwise/graph";
import * as expansion from "graphwise/expansion";
import * as ranking from "graphwise/ranking";
import * as mi from "graphwise/ranking/mi";
import * as seeds from "graphwise/seeds";
import * as traversal from "graphwise/traversal";
import * as structures from "graphwise/structures";
import * as extraction from "graphwise/extraction";
import * as utils from "graphwise/utils";
import * as gpu from "graphwise/gpu";
import * as schemas from "graphwise/schemas";
import * as async_ from "graphwise/async";

// Verify modules are not empty
const modules = [
  { name: "graphwise", module: graphwise },
  { name: "graph", module: graph },
  { name: "expansion", module: expansion },
  { name: "ranking", module: ranking },
  { name: "mi", module: mi },
  { name: "seeds", module: seeds },
  { name: "traversal", module: traversal },
  { name: "structures", module: structures },
  { name: "extraction", module: extraction },
  { name: "utils", module: utils },
  { name: "gpu", module: gpu },
  { name: "schemas", module: schemas },
  { name: "async", module: async_ },
];

for (const { name, module } of modules) {
  const exportCount = Object.keys(module).length;
  if (exportCount === 0) {
    throw new Error(`Module "${name}" has no exports`);
  }
  console.log(`✓ ${name}: ${exportCount} exports`);
}

console.log("All export paths verified successfully");
