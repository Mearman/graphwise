## 1.0.0 (2026-03-24)

### Features

* **expansion:** add barrel exports for expansion module ([4372b1a](https://github.com/Mearman/graphwise/commit/4372b1a52c9ff7c2766c348ec09ef9efb3434d2d))
* **expansion:** add BASE expansion engine ([3074725](https://github.com/Mearman/graphwise/commit/307472502b525c7ab7a749e09a298a1eb5e47759))
* **expansion:** add DOME expansion algorithm ([2b02d0a](https://github.com/Mearman/graphwise/commit/2b02d0afa6f4431a471219cb166c514692aee09a))
* **expansion:** add EDGE expansion algorithm ([5e9bb9d](https://github.com/Mearman/graphwise/commit/5e9bb9d9c4193b3f341993503b6233fab8b02522))
* **expansion:** add HAE expansion algorithm ([7635b6a](https://github.com/Mearman/graphwise/commit/7635b6a1eab390dbb456697c22653fb31558c40b))
* **expansion:** add MAZE expansion algorithm ([14a4e10](https://github.com/Mearman/graphwise/commit/14a4e1029a9eb05174ea495caced037fcd07946f))
* **expansion:** add PIPE expansion algorithm ([32199d3](https://github.com/Mearman/graphwise/commit/32199d3173f761b6e014f0cf5ac30e340576df4a))
* **expansion:** add REACH expansion algorithm ([f6f48d8](https://github.com/Mearman/graphwise/commit/f6f48d8ebba279c0b264ae04230eca99bb31a2e6))
* **expansion:** add SAGE expansion algorithm ([5aa5abc](https://github.com/Mearman/graphwise/commit/5aa5abc2d81edf42632c3882b82e5c41ba8e758e))
* **extraction:** add subgraph extraction utilities ([64816f9](https://github.com/Mearman/graphwise/commit/64816f946fc130500c64654e31e614b00c587ae5))
* **gpu:** add WebGPU context and CSR matrix support ([84849c1](https://github.com/Mearman/graphwise/commit/84849c14539d60fbcb7e6078704267dbb042623d))
* **graph:** add adjacency map graph implementation ([e76b82b](https://github.com/Mearman/graphwise/commit/e76b82baf79a999e31b53124c53ca969c871eb39))
* **graph:** add core graph types and interfaces ([b0c2060](https://github.com/Mearman/graphwise/commit/b0c206026327887a49c4bdfa4eadc7636b5ddfea))
* **ranking:** add Adaptive MI and barrel exports ([6ce1288](https://github.com/Mearman/graphwise/commit/6ce1288a86bfe4d471c7b04a90c2f693d1479d78))
* **ranking:** add barrel exports for ranking module ([5f8793e](https://github.com/Mearman/graphwise/commit/5f8793ee6520b01f7346ace09084d4f8922ec9dd))
* **ranking:** add ETCH and NOTCH MI variants ([8433111](https://github.com/Mearman/graphwise/commit/84331111065562d6d14c202f1ba14c9ac747e317))
* **ranking:** add Jaccard and Adamic-Adar MI variants ([85a32c2](https://github.com/Mearman/graphwise/commit/85a32c206e5fe469eb1038740783c8a544e05443))
* **ranking:** add PARSE algorithm and baseline rankers ([bac6c2b](https://github.com/Mearman/graphwise/commit/bac6c2b2d4e3864453dd042bfda3e31c2789f225))
* **ranking:** add SCALE, SKEW, and SPAN MI variants ([c9de77c](https://github.com/Mearman/graphwise/commit/c9de77c17bd910c5c906f297ea69b1d7b14d085b))
* **schemas:** add Zod validation schemas for algorithm parameters ([bab00c9](https://github.com/Mearman/graphwise/commit/bab00c984c58e2367a90d96ed15b254cfd04db1b))
* **seeds:** add GRASP seed selection algorithm ([82917d9](https://github.com/Mearman/graphwise/commit/82917d96f0409b21efaa0500987df608961b8ddb))
* **seeds:** add Stratified seed selection algorithm ([2c8f434](https://github.com/Mearman/graphwise/commit/2c8f434e10c2434242c25ec6a263c262a2967caf))
* **traversal:** add BFS and DFS traversal algorithms ([62105ff](https://github.com/Mearman/graphwise/commit/62105ffabd0bd337b2ad3ddec9be8d6823e1078d))
* **utils:** add shared utility functions for graph algorithms ([b6314c8](https://github.com/Mearman/graphwise/commit/b6314c83e1140705fae288bf91172c4efc56e260))

### Tests

* **expansion:** add unit tests for expansion algorithms ([620c3ce](https://github.com/Mearman/graphwise/commit/620c3ce3c8d5dd4d60026505848f47d6c7996726))
* **graph:** add unit tests for AdjacencyMapGraph ([07e6943](https://github.com/Mearman/graphwise/commit/07e69430f5693eb1d6f74a44e400ef64d9f2b4a5))
* **ranking:** add unit tests for PARSE and MI variants ([eb3129e](https://github.com/Mearman/graphwise/commit/eb3129e1471de8d8259f28c1490bd249b234db28))
* **seeds:** add unit tests for GRASP and Stratified seed selection ([c7d6046](https://github.com/Mearman/graphwise/commit/c7d60468850c1b43a3b6a77ede6e188e30bacbd6))

### Build System

* **ci:** enable caching for ESLint and Vitest ([86c295e](https://github.com/Mearman/graphwise/commit/86c295e3bfe5e50ac08fbde6f03b3a56cd8692e4))
* **ci:** exclude build config files from typecheck ([ce5c367](https://github.com/Mearman/graphwise/commit/ce5c3672e8ee03971afa24a61ad5cd3b534275b7))
* **ci:** fix declaration file output paths ([a23f57d](https://github.com/Mearman/graphwise/commit/a23f57d530ebc765da0252b6729d01d1d318300c))
* **ci:** fix turbo config and enable incremental TypeScript builds ([a04a2db](https://github.com/Mearman/graphwise/commit/a04a2dbd42f69e714df1fc1f19cb50eef21f2f29))
* **deps:** add eslint override for GPU test type assertions ([8d09281](https://github.com/Mearman/graphwise/commit/8d092810a069e087e89148a37fedd77a8c2fd5e3))
* **deps:** add main entry point with public API exports ([30a1d42](https://github.com/Mearman/graphwise/commit/30a1d427f4512a5b6311dcceb85c2b4c1a9b9a12))
* fix repository URL format for npm ([b7fcab9](https://github.com/Mearman/graphwise/commit/b7fcab967814dac44e52c3ce235b816fcb366198))

### Continuous Integration

* add GitHub Actions CI workflow ([b91165b](https://github.com/Mearman/graphwise/commit/b91165bf12fddbe0b46cbd59bc40fc90157c1c78))
* add semantic-release configuration ([1fb78c7](https://github.com/Mearman/graphwise/commit/1fb78c72edd042fd8dab6e961b4f119596002aab))
* configure Dependabot for automated dependency updates ([ead1754](https://github.com/Mearman/graphwise/commit/ead175409cb6789d7b8bdc219db980465c227c36))
* enable patch releases for all conventional commit types ([7ad93d6](https://github.com/Mearman/graphwise/commit/7ad93d6ac4a0f3bbe45048ef88f45d00d0920978))
* fix ESLint parsing of configuration files ([17e6bb6](https://github.com/Mearman/graphwise/commit/17e6bb65dca334b2e615be3442cca4860c271bf8))

### Miscellaneous Chores

* **deps:** add build and tooling scopes to commitlint ([a12a406](https://github.com/Mearman/graphwise/commit/a12a406eb90a15556f63e556a7c391b9d5d77f3a))
* initialise project with build configuration ([6b2190e](https://github.com/Mearman/graphwise/commit/6b2190e288200e4c47a236154db6060cad131260))
* initialise project with build configuration ([dd59620](https://github.com/Mearman/graphwise/commit/dd596206ac45448b0a3961779e24ba888cde41af))
* initialise project with build configuration ([2ece353](https://github.com/Mearman/graphwise/commit/2ece35320255c2018c9f499663a863bd67f89b5c))
