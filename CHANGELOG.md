## [1.1.1](https://github.com/Mearman/graphwise/compare/v1.1.0...v1.1.1) (2026-03-24)

### Continuous Integration

* update GitHub Actions to newer versions ([1431ad6](https://github.com/Mearman/graphwise/commit/1431ad689a35d52d2f0776343b9bc42a95930a82))

## [1.1.0](https://github.com/Mearman/graphwise/compare/v1.0.0...v1.1.0) (2026-03-24)

### Features

* **expansion:** add barrel exports for expansion module ([8050db2](https://github.com/Mearman/graphwise/commit/8050db2ac776cf593cdce0ed0729a3c8003e1353))
* **expansion:** add BASE expansion engine ([bba418f](https://github.com/Mearman/graphwise/commit/bba418fa11cb4e595c8ffd5ab77c9e7f9e5d08ec))
* **expansion:** add DOME expansion algorithm ([b733601](https://github.com/Mearman/graphwise/commit/b73360190d9169b93e6fe72d769ee205a8454674))
* **expansion:** add EDGE expansion algorithm ([18cae90](https://github.com/Mearman/graphwise/commit/18cae90c23ef3db4f5b872a033ade0302b45cbe2))
* **expansion:** add HAE expansion algorithm ([2b24c53](https://github.com/Mearman/graphwise/commit/2b24c536f98a8bf30a55618f5ba6db1dc23e154b))
* **expansion:** add MAZE expansion algorithm ([bcde61c](https://github.com/Mearman/graphwise/commit/bcde61c0d7cd0e102547b0f7c66738631adfb27d))
* **expansion:** add PIPE expansion algorithm ([4a86620](https://github.com/Mearman/graphwise/commit/4a8662095cebb7b9ead172b8a9cc8562f0684dae))
* **expansion:** add REACH expansion algorithm ([25498d0](https://github.com/Mearman/graphwise/commit/25498d070ad52b5f6a6e33022831e58581a237b8))
* **expansion:** add SAGE expansion algorithm ([821202e](https://github.com/Mearman/graphwise/commit/821202ea6cb00ef1ffa8628a32cdd88212f1ed23))
* **extraction:** add subgraph extraction utilities ([af8cfef](https://github.com/Mearman/graphwise/commit/af8cfefe77050ddf5761ba9de2e4eea041d13f7a))
* **gpu:** add WebGPU context and CSR matrix support ([d198269](https://github.com/Mearman/graphwise/commit/d198269b50bcf0235a6cb6770bd798cc02c9335d))
* **graph:** add adjacency map graph implementation ([53b612a](https://github.com/Mearman/graphwise/commit/53b612acd19b3c53ca145dd41f978380e1f7c2b0))
* **graph:** add core graph types and interfaces ([6da1dee](https://github.com/Mearman/graphwise/commit/6da1deef4fdc0af23fb8b0010f4539d0c4a4ba67))
* **ranking:** add Adaptive MI and barrel exports ([271bfeb](https://github.com/Mearman/graphwise/commit/271bfebbcb69cf8588f4c012544700d39c3faad2))
* **ranking:** add barrel exports for ranking module ([8b6613a](https://github.com/Mearman/graphwise/commit/8b6613a50420df6adc863aa68d1db9f13b1e2903))
* **ranking:** add ETCH and NOTCH MI variants ([ff22b35](https://github.com/Mearman/graphwise/commit/ff22b35d168a2ce3e8b4079d574fe1a7b88a77ed))
* **ranking:** add Jaccard and Adamic-Adar MI variants ([4e70de0](https://github.com/Mearman/graphwise/commit/4e70de0726e46f46b7a6af07936952d0897aaf57))
* **ranking:** add PARSE algorithm and baseline rankers ([1593171](https://github.com/Mearman/graphwise/commit/15931715ceac2f00ce5e1a9eb7d694271e748fd4))
* **ranking:** add SCALE, SKEW, and SPAN MI variants ([53fa8c1](https://github.com/Mearman/graphwise/commit/53fa8c1da3b1f81cec4f8546e3d8179827ef9a86))
* **schemas:** add Zod validation schemas for algorithm parameters ([05bf774](https://github.com/Mearman/graphwise/commit/05bf774d56a60ae1e2474d911baba3554c5904c9))
* **seeds:** add GRASP seed selection algorithm ([02d0e2e](https://github.com/Mearman/graphwise/commit/02d0e2ecd108bd6c25803559fa96d4b62b56f927))
* **seeds:** add Stratified seed selection algorithm ([b070bb7](https://github.com/Mearman/graphwise/commit/b070bb71b6b641609f7b84c01a71390dcc41d954))
* **traversal:** add BFS and DFS traversal algorithms ([bc29015](https://github.com/Mearman/graphwise/commit/bc29015379b4acd5c1c764169282ecb1799c8b82))
* **utils:** add shared utility functions for graph algorithms ([d1093cd](https://github.com/Mearman/graphwise/commit/d1093cd8d1bd826aa2e90212910010922567620d))

### Tests

* **expansion:** add unit tests for expansion algorithms ([d10a73b](https://github.com/Mearman/graphwise/commit/d10a73bb16fc7dd62e69bfebcbc28a5b0a4c797d))
* **graph:** add unit tests for AdjacencyMapGraph ([257c4f9](https://github.com/Mearman/graphwise/commit/257c4f938e7c883449587e2f7188bcd860d70086))
* **ranking:** add unit tests for PARSE and MI variants ([63f84c9](https://github.com/Mearman/graphwise/commit/63f84c90c16f2721f4b9095c70cba5b2dac09760))
* **seeds:** add unit tests for GRASP and Stratified seed selection ([d79276a](https://github.com/Mearman/graphwise/commit/d79276aad2dd4e6274e32ae1cdae2d7c1a605dda))

### Build System

* **ci:** enable caching for ESLint and Vitest ([e9a168e](https://github.com/Mearman/graphwise/commit/e9a168e756dea46704b1d37e32b5a4b1468ad354))
* **ci:** exclude build config files from typecheck ([bb449aa](https://github.com/Mearman/graphwise/commit/bb449aaa484ef0fd5930a82756bd939b33196f15))
* **ci:** fix declaration file output paths ([b8db7b4](https://github.com/Mearman/graphwise/commit/b8db7b4ab1ed6b131e6e8c0c02b2e56a5e5fedc0))
* **ci:** fix turbo config and enable incremental TypeScript builds ([2dc720d](https://github.com/Mearman/graphwise/commit/2dc720dc26be9c09eec78de5cb1105e5774b312e))
* **deps:** add eslint override for GPU test type assertions ([80bdc34](https://github.com/Mearman/graphwise/commit/80bdc346e359af672059ae32e9926c01c0f395d1))
* **deps:** add main entry point with public API exports ([a741acb](https://github.com/Mearman/graphwise/commit/a741acb1702490bb44337ae13b57192c3c7ea36b))
* fix repository URL format for npm ([1c8f1b0](https://github.com/Mearman/graphwise/commit/1c8f1b0e51b76b5b3e4684c1251f9cb5a260dc45))

### Continuous Integration

* add GitHub Actions CI workflow ([d6836bc](https://github.com/Mearman/graphwise/commit/d6836bc9a38bc4c1ba871cead7a37575cb3f9d09))
* add semantic-release configuration ([c94d562](https://github.com/Mearman/graphwise/commit/c94d562d94d20e4e8150e20b9243c7520326a4b1))
* configure Dependabot for automated dependency updates ([74fb2eb](https://github.com/Mearman/graphwise/commit/74fb2eb72de052fa726ac92e9fa4786a99a0c104))
* enable patch releases for all conventional commit types ([e51b2f2](https://github.com/Mearman/graphwise/commit/e51b2f230f2188134df8f5380ef1e4315f3ba228))
* fix ESLint parsing of configuration files ([3e52d36](https://github.com/Mearman/graphwise/commit/3e52d36abed726b90523a9a5d6e316f50814fe2e))

### Miscellaneous Chores

* **deps:** add build and tooling scopes to commitlint ([867e8e0](https://github.com/Mearman/graphwise/commit/867e8e05e11479ebf0f6a9ecf1cc16ebc065c566))
* initialise project with build configuration ([790e273](https://github.com/Mearman/graphwise/commit/790e273ba9ce619a889af5a8205f8613e7a3124e))
* initialise project with build configuration ([9b49756](https://github.com/Mearman/graphwise/commit/9b497567f60dc7b64f1d26ec87ce04256879ff09))
