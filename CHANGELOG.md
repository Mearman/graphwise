## [1.11.0](https://github.com/Mearman/graphwise/compare/v1.10.0...v1.11.0) (2026-03-31)

### Features

* **seeds:** add CREST community-bridge seed selection ([1ddb957](https://github.com/Mearman/graphwise/commit/1ddb957c5c682c02cd25294f9e3ad9a0acf112ec))
* **seeds:** add CRISP connectivity-rich informed seed pairing ([4926a8f](https://github.com/Mearman/graphwise/commit/4926a8f6db9d85bab15c0ec7e95434743e2cadfb))
* **seeds:** add SPINE structural position seed selection ([bb76889](https://github.com/Mearman/graphwise/commit/bb7688937839e3c345234d5f67e34709c2b2b7e8))
* **seeds:** add stride seed selection to barrel exports ([dfa3fbb](https://github.com/Mearman/graphwise/commit/dfa3fbb969a4ba27ab6354788a7fb92a42109a59))
* **seeds:** add STRIDE triad-based seed selection ([9c4d2b4](https://github.com/Mearman/graphwise/commit/9c4d2b47da769ffbcb1f1a813ad050e08c51df94))

### Tests

* **expansion:** add FUSE batch priority function tests ([9c907aa](https://github.com/Mearman/graphwise/commit/9c907aa06bfde8d7b1cb0a2980ee66cc6789b285))
* **expansion:** add LACE batch priority function tests ([1df393e](https://github.com/Mearman/graphwise/commit/1df393e8ee01f7f2e027b13d5fc56d0704fa40f0))
* **expansion:** add SIFT batch priority function tests ([febdd82](https://github.com/Mearman/graphwise/commit/febdd82289f0ec1e6b8840781aa89ec803455526))
* **ranking:** add Katz edge case tests ([8bd469d](https://github.com/Mearman/graphwise/commit/8bd469d4632d0ce5e3a36db42e5dd7ffd33a85ab))
* **seeds:** add CREST unit tests ([338eff6](https://github.com/Mearman/graphwise/commit/338eff674524a8a9f0c5a903fd941f1e42b1587f))
* **seeds:** add CRISP unit tests ([b6c43f4](https://github.com/Mearman/graphwise/commit/b6c43f46e0de8e598353f178c89494b6c1a8035e))
* **seeds:** add SPINE unit tests ([c3ba12e](https://github.com/Mearman/graphwise/commit/c3ba12e0016c8d9f1227aee6515253331dbb421e))
* **seeds:** add STRIDE unit tests ([cf63250](https://github.com/Mearman/graphwise/commit/cf63250e363159b2e22eeb977f011e6158561240))

## [1.10.0](https://github.com/Mearman/graphwise/compare/v1.9.1...v1.10.0) (2026-03-25)

### Features

* **expansion:** add batch priority support for GPU acceleration ([56dff83](https://github.com/Mearman/graphwise/commit/56dff83d1648bb9f7c3b8ae519ea54e62fccdbd1))
* **expansion:** add GPU batch priority functions for LACE, FUSE, SIFT ([5576807](https://github.com/Mearman/graphwise/commit/557680776dbe615f51e0f74f63473a8481fece08))
* **gpu:** add CSR-backed ReadableGraph adapter ([9a60f97](https://github.com/Mearman/graphwise/commit/9a60f977b4278d4759c271a086e56b981930a160))
* **gpu:** add gpuMIBatch operation for batch MI computation ([8ecf81f](https://github.com/Mearman/graphwise/commit/8ecf81fe97c3fc27952d9746c67e1446fa67c9ed))
* **gpu:** add neighbourhood intersection kernel with MI variant helpers ([92c2563](https://github.com/Mearman/graphwise/commit/92c256393bcbaa6a2cdbc6de02c70a6fda6a75a1))
* **graph:** add batch operation protocol extensions ([8e0c001](https://github.com/Mearman/graphwise/commit/8e0c001eb8e0e9d112d626377ce41a2daa4b59a1))
* **graph:** add batched runner for generator-based algorithms ([5e7e78b](https://github.com/Mearman/graphwise/commit/5e7e78b5a00ebd1302fdf5791b9c53be63163106))
* **ranking:** add GPU compute options to BaselineConfig ([5b18dd4](https://github.com/Mearman/graphwise/commit/5b18dd45dc8916aa7f3764d1d09d92f9350db490))
* **ranking:** add GPU support to pagerank baseline ([3976bf6](https://github.com/Mearman/graphwise/commit/3976bf641740feec0fb73ba6b8446436ecf41ccc))
* **ranking:** add GPU-accelerated communicability async variant ([3aad727](https://github.com/Mearman/graphwise/commit/3aad7271bac09b35975652a2a266cf8c79e61636))
* **ranking:** add GPU-accelerated katz async variant with SpMV ([fadc64b](https://github.com/Mearman/graphwise/commit/fadc64b3b5b15bbf7d692d13661289f3ad977b8d))
* **ranking:** add GPU-accelerated PARSE implementation (Phase 6) ([a0b6d4c](https://github.com/Mearman/graphwise/commit/a0b6d4c3fd3a4960687864aff67bec43e1f57edc))
* **src:** add grasp-gpu.ts ([af6ec6a](https://github.com/Mearman/graphwise/commit/af6ec6a3cd2c2f87e9f5bebf8ed9eaa8f632e827))
* **src:** add index.ts ([006fb3b](https://github.com/Mearman/graphwise/commit/006fb3b2d48a09bacf1f1918c89e0f6425c22d61))
* **src:** add kernel.ts ([e8647e5](https://github.com/Mearman/graphwise/commit/e8647e5a81e9ab6e6454438766093b02e957f3b7))
* **src:** add logic.ts ([ceb0c04](https://github.com/Mearman/graphwise/commit/ceb0c0468951dfda0a4c1698d733d341fe2f8335))
* **src:** add logic.unit.test.ts ([edd1516](https://github.com/Mearman/graphwise/commit/edd1516c442cfd220230027c091e34b6c16256e2))

### Bug Fixes

* **build:** allow eslint-disable in GPU source files ([98d0847](https://github.com/Mearman/graphwise/commit/98d084749b2fd7f69a6f8f90c92b26ddc0e3c80b))
* **gpu/kmeans:** add type assertions for array buffer and RNG return types ([0c380b6](https://github.com/Mearman/graphwise/commit/0c380b6c6750f1c00a8d7cea9ac0a123232d89f2))
* **gpu/kmeans:** use any types for TypeGPU buffers and add comprehensive type safety ([957ba40](https://github.com/Mearman/graphwise/commit/957ba4010222259b2399775dd42dd982bb690f61))
* **gpu:** remove unnecessary eslint-disable comments in kmeans ([9b8d6d4](https://github.com/Mearman/graphwise/commit/9b8d6d47afe7fb3871f28b59ca70f8522375115b))
* **gpu:** safe buffer creation and type casts for TypeGPU operations ([1511293](https://github.com/Mearman/graphwise/commit/1511293b5d0d3fdda1ad4d9c88ed01c4f2cb60b0))
* **seeds/grasp:** convert to synchronous implementation and improve environment detection ([8b96829](https://github.com/Mearman/graphwise/commit/8b96829ad7a439bd6905f3e48a3053f664202ae0))
* **src:** update operations.ts ([f8a7673](https://github.com/Mearman/graphwise/commit/f8a767334552eb63372eff26ecabbf21418efab9))

### Performance Improvements

* **ranking:** parallelise parseAsync path ranking ([d5d840b](https://github.com/Mearman/graphwise/commit/d5d840b0202b8b5c82bdf719ad82607b4cf58384))

## [1.9.1](https://github.com/Mearman/graphwise/compare/v1.9.0...v1.9.1) (2026-03-25)

### Bug Fixes

* **ci:** remove redundant npm publish step ([e126fb6](https://github.com/Mearman/graphwise/commit/e126fb6b7c9d096ee11716b04042063339eb8e7f))

## [1.9.0](https://github.com/Mearman/graphwise/compare/v1.8.1...v1.9.0) (2026-03-25)

### ⚠ BREAKING CHANGES

* **gpu:** GPUContext class removed; use initGPU() instead

### Features

* **ci:** add tarball validation with smoke test job ([462b35b](https://github.com/Mearman/graphwise/commit/462b35b5fb4e1aa0fe63f5e5e316a1d73763e948))
* **gpu:** add CPU logic for BFS level kernel ([8d252a8](https://github.com/Mearman/graphwise/commit/8d252a8dbd9c2d343470807612812cf93d2c4d77))
* **gpu:** add CPU logic for degree histogram kernel ([381fe59](https://github.com/Mearman/graphwise/commit/381fe59f84dbc842a355c797d1373c8bba64286d))
* **gpu:** add CPU logic for Jaccard similarity kernel ([8eb73d2](https://github.com/Mearman/graphwise/commit/8eb73d29d68776e0f88efa1d4da329bae761747e))
* **gpu:** add CPU logic for PageRank kernel ([84a6d7f](https://github.com/Mearman/graphwise/commit/84a6d7fe414c5f0a7fbef7e0ad6863212b8fc6f6))
* **gpu:** add CPU logic for sparse matrix-vector multiply kernel ([a88414e](https://github.com/Mearman/graphwise/commit/a88414ee8406b89e083f8d46d3ff7cc5e3c79ab4))
* **gpu:** add dispatch layer and high-level GPU operations ([dab17b6](https://github.com/Mearman/graphwise/commit/dab17b6a19839ae6dae33d3a29c5d20f95b6004e))
* **gpu:** add TypeGPU dependencies and vite plugin ([76d55e6](https://github.com/Mearman/graphwise/commit/76d55e6852f89d2ca5ad8c0473790def9a203cfc))

### Bug Fixes

* **build:** resolve build issues ([a439712](https://github.com/Mearman/graphwise/commit/a4397122c100d09d30171f9ba1608a0705c4d0ab))
* **build:** run tsc on full project in lint-staged ([d206471](https://github.com/Mearman/graphwise/commit/d20647160c7dad57a07b54ca6b8bd275617f1a49))
* **ci:** add --ignoreConfig flag to tsc command in smoke-test ([90956bd](https://github.com/Mearman/graphwise/commit/90956bdbe678fa6871dc6ee511eebce9d283ea45))
* **ci:** add dom lib to smoke-test tsconfig ([146fda1](https://github.com/Mearman/graphwise/commit/146fda174970484476149786a64609651df3d6f9))
* **ci:** add tsconfig for smoke-test fixture ([05e3ae3](https://github.com/Mearman/graphwise/commit/05e3ae39e91f4ad3a6d991d7c6e4f1e8efbd1ae3))
* **ci:** download smoke-test tarball to fixture directory ([1b80f47](https://github.com/Mearman/graphwise/commit/1b80f47fd8ecb9668fbbd051ec29b755f7312b76))
* **ci:** use local file path for smoke-test tarball install ([7a79e2c](https://github.com/Mearman/graphwise/commit/7a79e2c78d2ce7de6aa83520bd8172b256025ba4))

### Code Refactoring

* **gpu:** replace GPUContext with TypeGPU root ([986cf54](https://github.com/Mearman/graphwise/commit/986cf542e2babb3899a37f5542e531cddc34080d))
* **gpu:** replace raw GPUBuffer with TypeGPU typed buffers ([8296b54](https://github.com/Mearman/graphwise/commit/8296b54fcbd637676a09adef14fa71b27f0d5e20))

### Miscellaneous Chores

* **config:** remove wgsl exclusion from coverage config ([e3b6255](https://github.com/Mearman/graphwise/commit/e3b62559b36283e2e77dd8d1486c63014b9942d5))
* **gpu:** remove deprecated WGSL shader files ([dc52a87](https://github.com/Mearman/graphwise/commit/dc52a8761384f659cbc171c0881a46c8c98c9c00))

## [1.8.1](https://github.com/Mearman/graphwise/compare/v1.8.0...v1.8.1) (2026-03-25)

### Build System

* add expansion, ranking, and extraction module entries ([e08effc](https://github.com/Mearman/graphwise/commit/e08effc4ace930cb9173c6c9b343623c78c6df06))

## [1.8.0](https://github.com/Mearman/graphwise/compare/v1.7.0...v1.8.0) (2026-03-25)

### Features

* **expansion:** add async wrappers for complex expansion variants ([a2b45e0](https://github.com/Mearman/graphwise/commit/a2b45e0a9ae1190c79c376efe8b67e4af9d34c9b))
* **expansion:** add async wrappers for simple expansion variants ([fb3dd2a](https://github.com/Mearman/graphwise/commit/fb3dd2a4861f51e88c30bbe1108f518ac2594300))
* **graph:** add async module build entry and package exports ([366f8e6](https://github.com/Mearman/graphwise/commit/366f8e6f88bc11ac4fcbd8c1c58280be8b9cad3c))
* **ranking:** add async MI variants for all 13 measures ([d95b25f](https://github.com/Mearman/graphwise/commit/d95b25f3807587e337f0bb5cb7488900847d5dc1))
* **ranking:** add parseAsync for ranking paths over async graphs ([8c7a3a9](https://github.com/Mearman/graphwise/commit/8c7a3a9c1ac7546d483388ed5f3a63e420d5f0c7))

### Bug Fixes

* **utils:** remove unnecessary braces from lint-staged globs ([1a2fc18](https://github.com/Mearman/graphwise/commit/1a2fc1831a3b32a76fd5a6545428df6e49453e4e))

### Documentation

* **graph:** add async usage examples and module export documentation ([a0fb470](https://github.com/Mearman/graphwise/commit/a0fb4706ccbc7bbe344f7c7cc46b3a256729f220))

## [1.7.0](https://github.com/Mearman/graphwise/compare/v1.6.0...v1.7.0) (2026-03-25)

### Features

* **expansion:** add baseCore generator for async-capable expansion ([635ddc8](https://github.com/Mearman/graphwise/commit/635ddc89c7a0471df1c600061453d7002e064230))
* **expansion:** rewire base() to use baseCore + add baseAsync() ([7731e94](https://github.com/Mearman/graphwise/commit/7731e947ea4ebda9b4ff750cf1aae15f7b72e1fd))

### Code Refactoring

* **expansion:** extract pure helpers from BASE engine ([06f95ed](https://github.com/Mearman/graphwise/commit/06f95ed3cc84196732410982cf6c3ee75d1d3683))

## [1.6.0](https://github.com/Mearman/graphwise/compare/v1.5.2...v1.6.0) (2026-03-25)

### Features

* **expansion:** add generator coroutine protocol and sync/async runners ([0cc31ca](https://github.com/Mearman/graphwise/commit/0cc31ca3270e80afd24ecf1fe385782d111d6ca1))
* **graph:** add AsyncReadableGraph interface ([d07d629](https://github.com/Mearman/graphwise/commit/d07d62944b11b26def90381ff8168d339e6f9e73))
* **utils:** add wrapAsync test helper for AsyncReadableGraph ([6eb2d86](https://github.com/Mearman/graphwise/commit/6eb2d860e7e2f02a4ba0b26b5b672756490e096f))

### Documentation

* **graph:** add expansion baseline and MI baseline tables to README ([63bb8fd](https://github.com/Mearman/graphwise/commit/63bb8fd66f9a73283e7ca384ec043d01f3d952e7))

### Tests

* **graph:** add AsyncReadableGraph unit tests via wrapAsync ([2102f32](https://github.com/Mearman/graphwise/commit/2102f32bb5028db26264fd30b034932f0f99267f))

### Miscellaneous Chores

* **utils:** extend lint-staged to js, md, and json files ([f155869](https://github.com/Mearman/graphwise/commit/f1558695a89fd4f2e23b19f4c42d1d6be3d431ea))

## [1.5.2](https://github.com/Mearman/graphwise/compare/v1.5.1...v1.5.2) (2026-03-25)

### Tests

* **expansion:** add baseline comparisons to integration tests ([8496e60](https://github.com/Mearman/graphwise/commit/8496e60e90d03c707c04d817864cf3d4955da464))
* **expansion:** add cross-algorithm comparison integration tests ([3c49f83](https://github.com/Mearman/graphwise/commit/3c49f8300a282e0fba6c18c0537e2adc3dce0704))
* **ranking:** add PARSE-level baseline comparisons to MI variant tests ([ff9e51f](https://github.com/Mearman/graphwise/commit/ff9e51f88391bb3b9ad94c313415b11cd3358ec6))

## [1.5.1](https://github.com/Mearman/graphwise/compare/v1.5.0...v1.5.1) (2026-03-25)

### Code Refactoring

* **expansion:** extract priority helpers and delegate EDGE to HAE ([53e86e5](https://github.com/Mearman/graphwise/commit/53e86e5dd8a48f18dbc344276f2301426a86757c))
* **expansion:** extract shared test fixtures and assertion helpers ([13e5aff](https://github.com/Mearman/graphwise/commit/13e5aff811d44bcb8e08c9fc4ae1606ae8fd9d41))
* **ranking:** extract computeJaccard and normaliseAndRank helpers ([6a825db](https://github.com/Mearman/graphwise/commit/6a825db41aa80503bf9ec7a488d94377245222f0))

## [1.5.0](https://github.com/Mearman/graphwise/compare/v1.4.3...v1.5.0) (2026-03-25)

### Features

* **expansion:** add DFS, k-hop, random walk expansion baselines ([8b90d67](https://github.com/Mearman/graphwise/commit/8b90d67f4c761a680e0f194dc6fef0184bdf24d4))
* **ranking:** add cosine, sorensen, resource allocation, overlap, hub-promoted MI variants ([7a78257](https://github.com/Mearman/graphwise/commit/7a78257c6d508c1e52edb420777dd6d340a2f19b))
* **ranking:** add hitting time ranking baseline ([4a49da3](https://github.com/Mearman/graphwise/commit/4a49da399af6d9306523115c223a5e233594f1a5))
* **utils:** add comparison metrics module for algorithm evaluation ([d3c9ce0](https://github.com/Mearman/graphwise/commit/d3c9ce07cd920641b919f278f6deee97ebeacfa3))

### Bug Fixes

* **expansion:** correct FLUX sign mismatch and LACE test assertion ([bc9a5d8](https://github.com/Mearman/graphwise/commit/bc9a5d85d4aca77114c4316d4f7500b23b31a3a1))

## [1.4.3](https://github.com/Mearman/graphwise/compare/v1.4.2...v1.4.3) (2026-03-24)

### Documentation

* add visual separators between detailed algorithm descriptions ([8847972](https://github.com/Mearman/graphwise/commit/8847972613e17736dc6d66a4cd72f0d44a47266d))

## [1.4.2](https://github.com/Mearman/graphwise/compare/v1.4.1...v1.4.2) (2026-03-24)

### Bug Fixes

* **build:** correct LaTeX math rendering in README for GitHub ([63bf416](https://github.com/Mearman/graphwise/commit/63bf416e5e05a546e6a605665799bf4271f5d083))

## [1.4.1](https://github.com/Mearman/graphwise/compare/v1.4.0...v1.4.1) (2026-03-24)

### Bug Fixes

* **expansion:** remove redundant phase-transition scan in SAGE ([b21ccae](https://github.com/Mearman/graphwise/commit/b21ccae9e719e37eb94b9c65995b7853a84fdddf))

### Performance Improvements

* **expansion:** cache Jaccard scores in REACH to eliminate duplicate endpoint pair computations ([4ce9823](https://github.com/Mearman/graphwise/commit/4ce982328cef88b0b843aa710a09396e43fc13e0))
* **expansion:** replace string-based edge encoding with Map in base.ts ([3039404](https://github.com/Mearman/graphwise/commit/3039404bbb03e30172917bbb6de3ebcda2ea5294))

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
