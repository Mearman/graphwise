## [1.4.0](https://github.com/Mearman/graphwise/compare/v1.3.3...v1.4.0) (2026-03-24)

### Features

* **expansion:** add missing algorithm exports and fix test formatting ([70b3d23](https://github.com/Mearman/graphwise/commit/70b3d23f52821a955b0701553b65f2b8f53dccd8))
* **expansion:** implement correct EDGE algorithm ([a0f3633](https://github.com/Mearman/graphwise/commit/a0f363301003c6beca5acc30f5c6c2066ad612f4))
* **expansion:** implement correct MAZE algorithm ([054ed6c](https://github.com/Mearman/graphwise/commit/054ed6cf92bcec2a8b285802b1aba7d4cf745108))
* **expansion:** implement correct SAGE algorithm ([dc5d69f](https://github.com/Mearman/graphwise/commit/dc5d69f78405f42fa145dd686005b47f84a7d959))

### Bug Fixes

* **expansion:** fix LACE test function calls and remove unimplemented algorithm exports ([bc51ef7](https://github.com/Mearman/graphwise/commit/bc51ef76cb449d12f090d314f924b4f4e0c290df))
* **expansion:** use precomputed degree from context in DOME priority function ([2a904e1](https://github.com/Mearman/graphwise/commit/2a904e1498e37a3e538719d5778bf554cb650988))
* **graph:** prevent undirected edge count inflation on duplicate add calls ([a0dda72](https://github.com/Mearman/graphwise/commit/a0dda725f271dca42ac3363f7bb9a39621a1ba73))
* **ranking:** correct SCALE MI density calculation for undirected graphs ([12dcd22](https://github.com/Mearman/graphwise/commit/12dcd220c2bb8ba989714c9a535dbbc7931bcbee))
* **structures:** add indexMap for O(1) decreaseKey lookup in priority queue ([93d313e](https://github.com/Mearman/graphwise/commit/93d313eefb9ff6c56845cc79bc5ab03cc0f8f6e6))
* **utils:** correct unbiased estimator in approximate clustering coefficient ([ec2b36b](https://github.com/Mearman/graphwise/commit/ec2b36b7489baa31e2d4819bd997093a12737c67))

### Documentation

* add TIDE/LACE/WARP/FUSE/SIFT/FLUX variant algorithms to README ([44e6af4](https://github.com/Mearman/graphwise/commit/44e6af426ea19297c3ed7efec1fc2228da8ccda8))
* remove Origin column from expansion variants table ([b47b19c](https://github.com/Mearman/graphwise/commit/b47b19c8d7e66978910afeb56c363ff46d4f1d6a))

### Tests

* **expansion:** clean up REACH test formatting ([3fcb6eb](https://github.com/Mearman/graphwise/commit/3fcb6ebde9381cbf1c427675f865ed9d15c38703))
* **expansion:** fix formatting for HAE test assertions ([80e98e5](https://github.com/Mearman/graphwise/commit/80e98e5993f03c63df6111278beeb81df2e52b22))
* **expansion:** strengthen EDGE test assertions comparing village-node discovery ([bdad0d5](https://github.com/Mearman/graphwise/commit/bdad0d5a912611c8e4c02115e14da3555d9cc7a9))
* **expansion:** strengthen HAE integration test assertions comparing MI-based priority ([ca7e0e9](https://github.com/Mearman/graphwise/commit/ca7e0e97f362b1349bf7264cad774a06dccda8fe))
* **expansion:** strengthen HAE integration test assertions with budget constraint ([53d211e](https://github.com/Mearman/graphwise/commit/53d211efad0c8a92b6a71cdf0d7aaccebcea4f1d))
* **expansion:** strengthen PIPE inter-community path discovery assertions ([923cd05](https://github.com/Mearman/graphwise/commit/923cd0505e931d2c6501946816297d75614e7568))
* **expansion:** strengthen REACH integration test assertions with budget constraints ([3d162ff](https://github.com/Mearman/graphwise/commit/3d162ffc111fb6750c09675ab7bab988126c4939))
* **ranking:** add SCALE density comparison assertions for MI variant ([1827c3a](https://github.com/Mearman/graphwise/commit/1827c3a0bbd47fcc9721cfd8acc7caf966bcf3dd))
* **ranking:** add SPAN MI variant bridge vs within-cluster comparison assertions ([8021a22](https://github.com/Mearman/graphwise/commit/8021a22286183247563e93f78b211b1970e1be71))

## [1.3.3](https://github.com/Mearman/graphwise/compare/v1.3.2...v1.3.3) (2026-03-24)

### Documentation

* add Zenodo DOI to CITATION.cff and README badge ([cedbaf6](https://github.com/Mearman/graphwise/commit/cedbaf69d494f78383e54be93dc14f0c1713adbe))

## [1.3.2](https://github.com/Mearman/graphwise/compare/v1.3.1...v1.3.2) (2026-03-24)

### Documentation

* add CITATION.cff for repository citation metadata ([aa9884a](https://github.com/Mearman/graphwise/commit/aa9884a47bd9393c52d7e5d3f5d3b5a7c75511a8))

## [1.3.1](https://github.com/Mearman/graphwise/compare/v1.3.0...v1.3.1) (2026-03-24)

### Documentation

* add npm and github badges to README ([e5712ba](https://github.com/Mearman/graphwise/commit/e5712ba5069ce9600581e6f4d7f9afd5485905dc))

## [1.3.0](https://github.com/Mearman/graphwise/compare/v1.2.0...v1.3.0) (2026-03-24)

### Features

* **ranking:** rewrite etch mi variant with edge-type rarity weighting ([5d1ff1e](https://github.com/Mearman/graphwise/commit/5d1ff1e1bd7e68417eadc719409f7b20b0364688))
* **ranking:** rewrite notch mi variant with node-type rarity weighting ([15c9976](https://github.com/Mearman/graphwise/commit/15c9976febeba93f514d8551bd4b7cb80744cf44))
* **ranking:** rewrite scale mi variant to density-normalised jaccard ([cff639d](https://github.com/Mearman/graphwise/commit/cff639da0033b12988c9065b3f3c559412dbd141))
* **ranking:** rewrite skew mi variant with idf-style rarity weighting ([169db9f](https://github.com/Mearman/graphwise/commit/169db9fc6b10a76c246bf52236111ea975b0d2de))
* **ranking:** rewrite span mi variant with clustering coefficient penalty ([247474f](https://github.com/Mearman/graphwise/commit/247474f94acd7c42b0bacc94387adc028ef518a0))
* **utils:** add neighbourhood utility functions ([f41798c](https://github.com/Mearman/graphwise/commit/f41798c1dcc305ffd80541798172aba9859b8aa7))

### Code Refactoring

* **ranking:** fix adamic-adar formula and use utilities ([5ee40ef](https://github.com/Mearman/graphwise/commit/5ee40ef7d3772fabc5464b0069a3d505455a52fa))
* **ranking:** use neighbourhood utilities in jaccard ([ecb91d4](https://github.com/Mearman/graphwise/commit/ecb91d4dd5ec1b26753dcf60a16f65d09a0fcfed))
* **ranking:** use utilities in adaptive mi variant ([1d1d731](https://github.com/Mearman/graphwise/commit/1d1d7317b9d2daab1240f765a55f35ec47031618))

### Documentation

* add algorithm documentation to README ([f467848](https://github.com/Mearman/graphwise/commit/f4678481fcb532f2ad2acbc3a6a60e12b72086a5))

### Tests

* **ranking:** update mi variant test expectations for corrected formulas ([5510eb0](https://github.com/Mearman/graphwise/commit/5510eb063215e232a53b1d66ede8809780e34489))

## [1.2.0](https://github.com/Mearman/graphwise/compare/v1.1.1...v1.2.0) (2026-03-24)

### Features

* **expansion:** add baseline expansion algorithms ([81b6522](https://github.com/Mearman/graphwise/commit/81b652295307795cee11ee86a6be6a932d8989f0))
* **ranking:** add baselines barrel export module ([0e07b09](https://github.com/Mearman/graphwise/commit/0e07b097da93a97197eaf47792acf7030ebc61f5))
* **ranking:** add distance and aggregate baseline ranking algorithms ([41705b9](https://github.com/Mearman/graphwise/commit/41705b92004580cdb4eaa18efc766bdec6c5b128))
* **ranking:** add similarity and spectral baseline ranking algorithms ([93b7278](https://github.com/Mearman/graphwise/commit/93b7278a23c67708cdee824f8efa22787430c0dc))
* **ranking:** add structural baseline ranking algorithms ([8d9a6dd](https://github.com/Mearman/graphwise/commit/8d9a6dddfe1681124f1d39b38b8553e6ea96a78a))

### Bug Fixes

* **extraction:** resolve exactOptionalPropertyTypes in motif enumeration ([a0a6784](https://github.com/Mearman/graphwise/commit/a0a678475fe6aebc56348d18cd7dd9fbefa3c69f))
* **gpu:** resolve exactOptionalPropertyTypes in context and buffers ([d27f439](https://github.com/Mearman/graphwise/commit/d27f43943374cf15aa2bb5510ef1953dcc8996a7))

### Code Refactoring

* convert all index files to pure export * pattern ([272a50a](https://github.com/Mearman/graphwise/commit/272a50ae1c21c42853b963e053d554a87eca8903))

### Miscellaneous Chores

* **build:** add DOM library support to TypeScript configuration ([2b5ecca](https://github.com/Mearman/graphwise/commit/2b5ecca8fd8f5daecaf5d114666f7720d1822f2a))
* **build:** enforce direct-sibling barrel exports and pure re-export pattern ([6b27b23](https://github.com/Mearman/graphwise/commit/6b27b23f13fd66ed43540ccbd9129f5b676b567f))

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
