# repo-saga

[English](./README.md) · [中文](./README.zh.md)

> 把任意 git 仓库渲染成一份**文明编年史** —— 纪元、事件、海报与 JSON，全本地启发式生成。

<p align="center">
  <img src="https://raw.githubusercontent.com/teee32/repo-saga/main/examples/sample-saga.zh.svg" width="820" alt="repo-saga 示例海报（中文）" />
  <br/>
  <sub>示例海报（<code>epic</code> 主题，中文）。同一份数据可同时渲染中英文，详见 <a href="./examples/">examples/</a>。</sub>
</p>

`repo-saga` 读取仓库的 git 历史，将其转写成一份"编年史"：一组命名的**纪元**（"远古纪元: 初始混沌"、"迁徙纪元: TypeScript 入侵"、"神权时代: 格式化与 Linter 之治" …）以及附带证据的**事件**，证据全部来自 commit 本身。每一句结论都有事实依据：某天出现的 tsconfig.json、某次到来的 linter、某 90 天窗口内 800 个文件的搬迁。

它**完全在你的机器上运行**。不调用 OpenAI / Anthropic / Gemini，不需要登录，无 SaaS，无数据库。

```text
$ npx repo-saga https://github.com/sindresorhus/execa --lang zh
▲ repo-saga 正在分析 https://github.com/sindresorhus/execa
init       正在解析来源 …
git-log    正在读取 git 历史…
parsing    已解析 1,302 次提交                40%
detecting  正在运行启发式探测器…              70%
eras       正在将时间线划分为纪元…            85%
done       编年完成。                          100%

✓ 已写入 ./saga.json
✓ 已写入 ./saga.md
✓ 已写入 ./saga.svg（主题：epic）

纪元: 4   事件: 9   提交: 1,302
  2014–2017  远古纪元: 初始混沌
  2018–2020  迁徙纪元: TypeScript 入侵
  2021–2022  联邦纪元: Monorepo 联邦
  2023–2025  神权时代: 格式化与 Linter 之治
▲ repo-saga 预览地址 http://127.0.0.1:54323
```

## 安装

> 🚧 npm 包还没发布 —— `npx repo-saga` 会在后续版本提供。当前请从源码运行：

```bash
git clone https://github.com/teee32/repo-saga.git
cd repo-saga
pnpm install
pnpm build
```

随后直接调用 CLI：

```bash
node packages/cli/dist/index.js                              # 启动本地 web UI
node packages/cli/dist/index.js https://github.com/owner/repo
node packages/cli/dist/index.js ./my-project --theme academic --lang zh-Hant --out ./out
node packages/cli/dist/index.js ./my-project --era-split quarter
node packages/cli/dist/index.js ./my-project --era-split day --era-days 30
```

想要短命令的话，可以加 alias：

```bash
alias repo-saga="node $(pwd)/packages/cli/dist/index.js"
# 或者把当前 checkout 的 CLI 全局 link：
pnpm --filter repo-saga link --global
```

要求 Node.js 18.17+、`pnpm`，并且 `git` 在 `$PATH` 中可用。

## CLI 用法

| 写法                                                       | 行为                                                                                              |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `repo-saga`                                                | 启动本地服务器并自动打开浏览器，在 UI 中输入仓库即可。                                            |
| `repo-saga <repo>`                                         | 分析仓库，将 `saga.json`、`saga.md`、`saga.svg` 写入当前目录，并打开预览。                        |
| `repo-saga <repo> --no-open`                               | 同上，但不自动打开浏览器。                                                                        |
| `repo-saga <repo> --no-server`                             | 只生成文件，不启动 web 服务器。                                                                   |
| `repo-saga <repo> --out ./output`                          | 输出到 `./output`。                                                                               |
| `repo-saga <repo> --theme dark-fantasy`                    | 选择 SVG 主题（`epic` / `dark-fantasy` / `academic` / `minimal`）。                               |
| `repo-saga <repo> --lang zh`                               | 输出中文（Markdown 标题、SVG 海报、纪元/事件名称都本地化）。                                       |
| `repo-saga <repo> --lang fr`                               | 输出为任意受支持的 locale（覆盖 README_* 这组多语言代码，如 `fr`、`ja`、`ru`、`zh-Hant`）。      |
| `repo-saga <repo> --era-split quarter`                     | 强制按季度切分纪元（如 `2024-Q1`、`2024-Q2`）。                                                   |
| `repo-saga <repo> --era-split month`                       | 强制按月份切分纪元（如 `2024-01`、`2024-02`）。                                                   |
| `repo-saga <repo> --era-split day --era-days 30`           | 强制按固定天数窗口切分纪元（例如每 30 天一个纪元）。                                              |
| `repo-saga <repo> --max-commits 10000`                     | 大仓库时限制读取的 commit 数。                                                                    |
| `repo-saga <repo> --port 5555`                             | 固定 web 服务器端口。                                                                             |
| `repo-saga --help`                                         | 列出全部参数。                                                                                    |

`<repo>` 可以是：

- HTTPS 的 GitHub / GitLab / Bitbucket URL（`https://github.com/user/repo`）
- `git@…:user/repo.git` 形式的 SSH URL
- 本地包含 `.git` 的目录路径

给定远程 URL 时，`repo-saga` 会克隆到 `$TMPDIR/repo-saga-cache`（可用 `--cache-dir` 修改）。命中缓存时会自动 `fetch + ff-only pull`，不会用陈旧数据。

当前支持的 locale 代码与多语言 README 仓库常见集合对齐：`en`、`ar`、`bn`、`cs`、`da`、`de`、`el`、`es`、`fi`、`fr`、`he`、`hi`、`hu`、`id`、`it`、`ja`、`ko`、`ms`、`nl`、`no`、`pl`、`pt`、`ro`、`ru`、`sv`、`th`、`tr`、`uk`、`vi`、`zh`、`zh-Hant`。当前完整维护的文案表为英文与简体中文；其余 locale 会在整条链路中保留所选语言代码，并稳定回退到英文文案。

## 输出物

一次运行会产出三个 artefact（同时也作为 web 视图的数据源）：

### `saga.json`

分析结果的结构化快照：

```jsonc
{
  "schemaVersion": 1,
  "repo": {
    "name": "execa",
    "source": "https://github.com/sindresorhus/execa",
    "commitCount": 1302,
    "contributors": 84,
    "tagCount": 96,
    "firstCommitDate": "2014-...",
    "lastCommitDate": "2025-..."
  },
  "eras":  [ /* 3..7 个命名纪元，每个都带证据 */ ],
  "events": [ /* 14 个探测器输出，附证据 */ ],
  "stats":  { /* 按年份的 commits/语言/贡献者… */ },
  "meta":   { "generator": "repo-saga", "generatorVersion": "0.1.0", "durationMs": 1234 }
}
```

### `saga.md`

可打印 / 可粘贴的 Markdown 编年史（中英文都支持）：

```md
# execa 的文明史

## 远古纪元: 初始混沌, 2014–2015

> _奠基与即兴_

**证据：**
- 头 4 个月内的 168 次提交
- package.json 首次出现于 2014-04-19
- src/ 与 test/ 在 11 天内相继出现
…
```

### `saga.svg`

独立、可换主题的 SVG 海报，内嵌自包含的 PNG data URI 装饰资源。看起来像桌游里的"项目历史地图"。

## Web UI

不带参数运行 `repo-saga` 会启动本地 Fastify 服务器（随机端口）并打开 UI。功能：

- 粘贴仓库 URL 或本地路径，点击 **Generate**
- 进度事件通过 Server-Sent Events 实时推送
- 纪元以卡片呈现，点开可看到对应事件及其完整证据
- **时间旅行滑块** —— 拖到仓库生命中的任意一天，对应 ±30 天窗口里的活跃文件、核心贡献者、正在发生的 detector 事件会同步更新；当前所属纪元自动高亮
- **角色视角** —— 选一个贡献者，与其时间线重叠的事件会被改写为 ta 的口吻（"你在 2018 年加入……"），并显示 ta 改得最多的文件
- **"为什么触发？"** —— 每个事件卡都带一个调试面板，列出 detector 命中的判据规则，以及关键指标与阈值的对比
- 切换主题（`epic` / `dark-fantasy` / `academic` / `minimal`）
- 下载 SVG、复制 Markdown、查看 JSON

CORS 仅放行本机来源（localhost / 127.0.0.1 / ::1）—— 这是本地预览工具，没必要让任意网站读取你的仓库分析结果。

## 工作原理

没有机器学习模型，也没有 LLM。流程：

```text
                ┌─────────────┐
  url|path  ──▶ │  resolve    │  （需要时克隆到 $TMPDIR/repo-saga-cache）
                └─────────────┘
                       │
                       ▼
                ┌─────────────┐
                │  git log    │  --numstat 配合分隔符格式
                └─────────────┘
                       │
                       ▼
                ┌─────────────┐
                │  analyse    │  按年份的统计、信号文件索引、贡献者画像
                └─────────────┘
                       │
                       ▼
                ┌─────────────┐
                │  detectors  │  14 个启发式探测器 → DetectedEvent[]
                └─────────────┘
                       │
                       ▼
                ┌─────────────┐
                │   eras      │  把事件聚类成 3..7 个命名纪元
                └─────────────┘
                       │
                       ▼
                ┌─────────────┐
                │  renderers  │  saga.json / saga.md / saga.svg
                └─────────────┘
```

每个事件都带有 `confidence`（0..1）与 `severity`（`minor` / `notable` / `major` / `epoch-defining`）。证据始终是具体事实的列表（路径、日期、计数）—— 没有不带凭据的观点。

## 启发式探测器

| 探测器                  | 证据来源                                                                |
| ----------------------- | ----------------------------------------------------------------------- |
| `initial-chaos`         | 前 60 天的提交数、奠基者、奠基性文件                                    |
| `typescript-invasion`   | tsconfig 的出现 + ts/tsx 插入量越过 JS                                  |
| `great-refactor-war`    | 90 天窗口内文件被改动 / 重命名 / 删除最多的一段                         |
| `testing-famine`        | 多年时间内测试代码占插入量 < 5%                                          |
| `testing-renaissance`   | 测试配置文件出现 或 单年测试文件数跳跃                                  |
| `linting-theocracy`     | eslint / prettier / biome / ruff / husky / lint-staged 的出现           |
| `container-empire`      | Dockerfile / compose / k8s / helm / terraform 的出现                    |
| `monorepo-federation`   | pnpm-workspace / turbo / nx / lerna / packages/ / apps/ 的出现          |
| `dependency-cataclysm`  | 单次 commit 改动 lockfile > 1k 行                                        |
| `founder-exodus`        | 早期主要贡献者在最后四分之一时间段消失                                  |
| `new-dynasty`           | 只在最后四分之一出现并主导该时段的贡献者                                |
| `ai-priesthood`         | openai / anthropic / langchain / claude / cursor / copilot 等出现       |
| `bug-plague`            | 某月 ≥40% 的 commit 是 fix / bug / hotfix / revert                       |
| `release-empire`        | ≥5 个带日期的 tag，尤其是 semver 形态                                    |

所有探测器都是无状态的、并行运行。可以从 `@repo-saga/core` 导出 `Detector` 来加你自己的。

## 项目结构

```
repo-saga/
  package.json            ← 工作区根，scripts: build/test/lint/format
  pnpm-workspace.yaml
  tsconfig.base.json
  vitest.config.ts
  eslint.config.js
  packages/
    core/                 ← git 挖掘、analyzer、14 个探测器、纪元划分
    renderer/             ← JSON / Markdown / SVG 渲染（中英双语）
    server/               ← Fastify + SSE jobs API
    web/                  ← Vite + React UI
    cli/                  ← `repo-saga` bin 入口
  examples/               ← 示例 saga.json / saga.md / saga.svg（中英文）
```

## 开发

```bash
pnpm install
pnpm build      # 构建所有子包
pnpm test       # 跨包跑 vitest
pnpm lint       # 跨包跑 eslint
pnpm format     # prettier 写入
```

从工作区直接运行 CLI：

```bash
node packages/cli/dist/index.js https://github.com/sindresorhus/execa --out ./tmp --lang zh
```

启动开发版 UI（同时跑后端）：

```bash
# 终端 A（后端，作为代理目标）
node -e 'import("@repo-saga/server").then(m => m.startServer({ port: 7878 }))'
# 终端 B
pnpm --filter @repo-saga/web run dev
```

## 路线图

- 可插拔的探测器（文件路径或 npm 包）
- 更多主题（newspaper、blueprint、comic）
- 跨仓库的"文明相遇"对比
- HTML 海报导出（便于打印）
- 通过相同的启发式核心支持 hg / fossil
- 可选的 AI 重写叙事文案（默认关闭，自带 key）

## 贡献

欢迎 issue 与 PR。核心理念：编年史的每一行都必须有证据撑腰。如果某个探测器写了没有事实支撑的味道描述，那就是 bug。

1. `pnpm install`
2. `pnpm build && pnpm test && pnpm lint`
3. 为你新增的探测器或渲染改动加测试
4. 发 PR

## 许可证

[MIT](./LICENSE) © repo-saga 贡献者

## 社区

讨论、反馈与点子：[LinuxDo](https://linux.do)
