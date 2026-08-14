# DeepSeek Harness 插件市场 · Plugin Marketplace

> [← 返回主页](../README.md)

**中文**：DeepSeek Harness 是插件化架构（一切皆插件）。这里是**官方插件索引**：按能力分类，检索你需要的插件，复制安装命令即可使用。
**English**: DeepSeek Harness is plugin-based (everything is a plugin). This is the **official plugin index**, organized by capability — find a plugin, copy its install command, done.

## 快速安装 · Quick install

所有插件通过 `dsh plugin` 安装到你的 profile（pnpm 转发）：

```sh
# 1. 安装插件到 profile（首次会自动初始化 profile）
dsh plugin --profile myagent add <package>

# 2. 启动 profile
dsh --profile myagent
```

> 提示：一个能力通常由 **seam（接口）+ provider（实现）+ tool（模型工具）** 组合构成，例如文件系统 =
> `dsh-fs` + `dsh-fs-local` + `dsh-tool-fs`。表中已按能力族分组，便于一次装齐。
> Tip: a capability usually combines a **seam + provider + tool** set, e.g. filesystem = `dsh-fs` + `dsh-fs-local` + `dsh-tool-fs`.
> 安装后可启用/调整行为：编辑 profile 的 `cordis.patch.yml`（见[开发者文档](../docs/DEVELOPMENT.md)）。

## 目录 · Index

- [发行单元 Bundle](#发行单元-bundle)（3）
- [Agent 核心](#agent-核心)（8）
- [文件系统](#文件系统)（7）
- [Shell 与终端](#shell-与终端)（12）
- [子进程与代码执行](#子进程与代码执行)（4）
- [网络访问 Web](#网络访问-web)（6）
- [LSP 语言服务](#lsp-语言服务)（3）
- [子代理 Subagent](#子代理-subagent)（11）
- [工作流 Workflow](#工作流-workflow)（4）
- [后台任务 Jobs](#后台任务-jobs)（3）
- [MCP 客户端](#mcp-客户端)（1）
- [技能 Skill](#技能-skill)（4）
- [会话与持久化](#会话与持久化)（21）
- [计划·目标·待办](#计划目标待办)（6）
- [上下文 Context](#上下文-context)（4）
- [LLM 与提供商](#llm-与提供商)（5）
- [沙箱与安全](#沙箱与安全)（4）
- [交互与权限](#交互与权限)（5）
- [配置与凭证](#配置与凭证)（4）
- [守护与质量](#守护与质量)（4）
- [集成与桥接](#集成与桥接)（7）

## 发行单元 Bundle（3）

| 插件 Plugin | 描述 Description | 安装 Install |
|---|---|---|
| `@deepseek-ai/dsh-base` | The shared dsh core as a profile bundle: every profile's first patch layer, inserting the base plugin rows over the empty profile root | `dsh plugin --profile myagent add @deepseek-ai/dsh-base` |
| `@deepseek-ai/dsh-headless` | The dsh one-shot bundle: a direct core Agent/Session runner over dsh-base with no Host, HTTP, or browser layer | `dsh plugin --profile myagent add @deepseek-ai/dsh-headless` |
| `@deepseek-ai/dsh-web-app` | The dsh browser-surface bundle: the web patch layer over dsh-base plus the runtime glue plugin (frontend dist serving, web-surface prompt, bash runtime variables, URL line) | `dsh plugin --profile myagent add @deepseek-ai/dsh-web-app` |

## Agent 核心（8）

| 插件 Plugin | 描述 Description | 安装 Install |
|---|---|---|
| `@deepseek-ai/dsh-agent-default-model` | Default model selection shared by Agent entry points | `dsh plugin --profile myagent add @deepseek-ai/dsh-agent-default-model` |
| `@deepseek-ai/dsh-agent-loop` | The concrete agent loop plugin for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-agent-loop` |
| `@deepseek-ai/dsh-agent-tool-presentation` | Agent-plane presentation selector: composes one agent's tools as Code Mode, native, or both | `dsh plugin --profile myagent add @deepseek-ai/dsh-agent-tool-presentation` |
| `@deepseek-ai/dsh-agent` | Agent interface, registry, initiator scope, and event vocabulary for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-agent` |
| `@deepseek-ai/dsh-scope` | Scoped-context registration primitive (scope tags, scope-filtered event dispatch) for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-scope` |
| `@deepseek-ai/dsh-session` | Event-sourced session store for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-session` |
| `@deepseek-ai/dsh-system-prompt` | System prompt assembly registry for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-system-prompt` |
| `@deepseek-ai/dsh-tools` | Tool registry and execution pipeline for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-tools` |

## 文件系统（7）

| 插件 Plugin | 描述 Description | 安装 Install |
|---|---|---|
| `@deepseek-ai/dsh-fs-local` | Local-filesystem implementation of the DeepSeek Harness filesystem seam (ctx.fs) | `dsh plugin --profile myagent add @deepseek-ai/dsh-fs-local` |
| `@deepseek-ai/dsh-fs-observation-policy` | File-context policy plugin for the DeepSeek Harness — observed-state, read-before-edit, and version-guarded write/edit added over the ctx.fs provider seam through the fs/* event gate (no service API) | `dsh plugin --profile myagent add @deepseek-ai/dsh-fs-observation-policy` |
| `@deepseek-ai/dsh-fs-sandbox` | Sandbox-enforcing implementation of the DeepSeek Harness filesystem seam: fences write/edit by the per-call sandbox mode (read-only denies mutation, workspace-write contains it to the workspace + temp roots) while reads pass through | `dsh plugin --profile myagent add @deepseek-ai/dsh-fs-sandbox` |
| `@deepseek-ai/dsh-fs` | Abstract filesystem capability seam (ctx.fs) for the DeepSeek Harness — vocabulary types, the FileSystem service (text IO + optional version-guarded atomic mutations), and the fs/* policy event vocabulary | `dsh plugin --profile myagent add @deepseek-ai/dsh-fs` |
| `@deepseek-ai/dsh-tool-fs-search` | Model-facing filesystem discovery tools (glob, grep) backed by the packaged ripgrep binary (@vscode/ripgrep) | `dsh plugin --profile myagent add @deepseek-ai/dsh-tool-fs-search` |
| `@deepseek-ai/dsh-tool-fs` | Model-facing filesystem tools (read, write, edit) over the DeepSeek Harness filesystem seam (ctx.fs) | `dsh plugin --profile myagent add @deepseek-ai/dsh-tool-fs` |
| `@deepseek-ai/dsh-tool-str-replace-editor` | Model-facing view, create, literal replace, and line insert tool over the Harness filesystem service | `dsh plugin --profile myagent add @deepseek-ai/dsh-tool-str-replace-editor` |

## Shell 与终端（12）

| 插件 Plugin | 描述 Description | 安装 Install |
|---|---|---|
| `@deepseek-ai/dsh-bash-local` | Local-subprocess implementation of the DeepSeek Harness bash executor seam | `dsh plugin --profile myagent add @deepseek-ai/dsh-bash-local` |
| `@deepseek-ai/dsh-bash-sandbox` | Sandbox-consuming implementation of the DeepSeek Harness bash executor seam (confines every command via ctx.sandbox, reports denial/enforcement result facts) | `dsh plugin --profile myagent add @deepseek-ai/dsh-bash-sandbox` |
| `@deepseek-ai/dsh-pwsh-local` | Local PowerShell implementation of the DeepSeek Harness bash executor seam | `dsh plugin --profile myagent add @deepseek-ai/dsh-pwsh-local` |
| `@deepseek-ai/dsh-pwsh-sandbox` | Sandbox-consuming implementation of the DeepSeek Harness PowerShell executor seam (confines every command via ctx.sandbox, reports denial/enforcement result facts) | `dsh plugin --profile myagent add @deepseek-ai/dsh-pwsh-sandbox` |
| `@deepseek-ai/dsh-shell-env` | Tool-independent managed DSH_* shell environment registry | `dsh plugin --profile myagent add @deepseek-ai/dsh-shell-env` |
| `@deepseek-ai/dsh-shell` | Abstract bash executor seam (ctx.shell) for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-shell` |
| `@deepseek-ai/dsh-tool-bash-persistent` | Model-facing owner-scoped persistent Bash tool backed by the Harness PTY service | `dsh plugin --profile myagent add @deepseek-ai/dsh-tool-bash-persistent` |
| `@deepseek-ai/dsh-tool-bash` | Model-facing bash tool with optional generic background-job and sandbox-escalation support | `dsh plugin --profile myagent add @deepseek-ai/dsh-tool-bash` |
| `@deepseek-ai/dsh-tool-pwsh` | Model-facing pwsh tool over the bash executor seam | `dsh plugin --profile myagent add @deepseek-ai/dsh-tool-pwsh` |
| `@deepseek-ai/dsh-terminal-bash` | Persistent shell PTY backend over the DeepSeek Harness subprocess terminal primitive | `dsh plugin --profile myagent add @deepseek-ai/dsh-terminal-bash` |
| `@deepseek-ai/dsh-terminal` | Persistent PTY session seam for the DeepSeek Harness — owner-scoped ids, backend registry, interactive sends, reads, signals, and awaited cleanup | `dsh plugin --profile myagent add @deepseek-ai/dsh-terminal` |
| `@deepseek-ai/dsh-tool-terminal` | Six model-facing persistent PTY tools with owner isolation and generic background-job integration | `dsh plugin --profile myagent add @deepseek-ai/dsh-tool-terminal` |

## 子进程与代码执行（4）

| 插件 Plugin | 描述 Description | 安装 Install |
|---|---|---|
| `@deepseek-ai/dsh-code-runtime-worker-thread` | Worker-thread implementation of the DeepSeek Harness code-execution seam | `dsh plugin --profile myagent add @deepseek-ai/dsh-code-runtime-worker-thread` |
| `@deepseek-ai/dsh-code-runtime` | Abstract code-execution seam (ctx.codeRuntime) for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-code-runtime` |
| `@deepseek-ai/dsh-subprocess-local` | Local-subprocess implementation of the DeepSeek Harness subprocess seam | `dsh plugin --profile myagent add @deepseek-ai/dsh-subprocess-local` |
| `@deepseek-ai/dsh-subprocess` | Subprocess seam (ctx.subprocess) for the DeepSeek Harness — managed process groups, bounded spill-backed output, and escalated kills behind one abstract service | `dsh plugin --profile myagent add @deepseek-ai/dsh-subprocess` |

## 网络访问 Web（6）

| 插件 Plugin | 描述 Description | 安装 Install |
|---|---|---|
| `@deepseek-ai/dsh-tool-web` | Model-facing web tools (web_search, web_fetch) over the DeepSeek Harness web capability seam (ctx.web) | `dsh plugin --profile myagent add @deepseek-ai/dsh-tool-web` |
| `@deepseek-ai/dsh-web-fetch-http` | Anonymous public HTTP(S) fetch provider for the DeepSeek Harness web capability seam (ctx.web) | `dsh plugin --profile myagent add @deepseek-ai/dsh-web-fetch-http` |
| `@deepseek-ai/dsh-web-search-deepseek` | DeepSeek-backed search provider (native web_search via the Anthropic-compatible API) for the DeepSeek Harness web capability seam (ctx.web) | `dsh plugin --profile myagent add @deepseek-ai/dsh-web-search-deepseek` |
| `@deepseek-ai/dsh-web-search-exa` | Exa-backed search provider for the DeepSeek Harness web capability seam (ctx.web) | `dsh plugin --profile myagent add @deepseek-ai/dsh-web-search-exa` |
| `@deepseek-ai/dsh-web-search-perplexity` | Perplexity-backed search provider for the DeepSeek Harness web capability seam (ctx.web) | `dsh plugin --profile myagent add @deepseek-ai/dsh-web-search-perplexity` |
| `@deepseek-ai/dsh-web` | Abstract web access capability seam (ctx.web) for the DeepSeek Harness — search/fetch provider registry, registration-order-independent selection, request/result vocabulary, and the WebError taxonomy | `dsh plugin --profile myagent add @deepseek-ai/dsh-web` |

## LSP 语言服务（3）

| 插件 Plugin | 描述 Description | 安装 Install |
|---|---|---|
| `@deepseek-ai/dsh-lsp-stdio` | Generic stdio language-server provider for the DeepSeek Harness LSP capability seam (ctx.lsp) — spawns configured servers, translates JSON-RPC, and serves transient-open goToDefinition/findReferences/goToImplementation/hover queries in the host filesystem namespace | `dsh plugin --profile myagent add @deepseek-ai/dsh-lsp-stdio` |
| `@deepseek-ai/dsh-lsp` | Abstract LSP capability seam (ctx.lsp) for the DeepSeek Harness — language-server provider registry keyed by branded id and extension mapping, order-independent per-query selection, normalized definition/references/implementation/hover requests and results, and the LspError taxonomy | `dsh plugin --profile myagent add @deepseek-ai/dsh-lsp` |
| `@deepseek-ai/dsh-tool-lsp` | Model-facing lsp tool over the DeepSeek Harness LSP capability seam (ctx.lsp) — one read-only tool with goToDefinition/findReferences/goToImplementation/hover operations, one-based UTF-16 cursor coordinates, bounded location rendering, and hover normalization | `dsh plugin --profile myagent add @deepseek-ai/dsh-tool-lsp` |

## 子代理 Subagent（11）

| 插件 Plugin | 描述 Description | 安装 Install |
|---|---|---|
| `@deepseek-ai/dsh-subagent-acp` | Out-of-process ACP subagent backend: drives a child agent in a spawned subprocess over the Agent Client Protocol | `dsh plugin --profile myagent add @deepseek-ai/dsh-subagent-acp` |
| `@deepseek-ai/dsh-subagent-claude-code` | One-shot Claude Code subagent provider over the official Agent SDK | `dsh plugin --profile myagent add @deepseek-ai/dsh-subagent-claude-code` |
| `@deepseek-ai/dsh-subagent-codex` | One-shot Codex subagent provider over the official app-server protocol | `dsh plugin --profile myagent add @deepseek-ai/dsh-subagent-codex` |
| `@deepseek-ai/dsh-subagent-dsh-sdk` | Out-of-process SDK subagent backend: drives a child DeepSeek Harness runtime subprocess over stdio JSON-RPC through the TypeScript SDK client | `dsh plugin --profile myagent add @deepseek-ai/dsh-subagent-dsh-sdk` |
| `@deepseek-ai/dsh-subagent-fork-in-process` | In-process fork subagent backend: runs a child agent seeded with a prefix of the parent's log | `dsh plugin --profile myagent add @deepseek-ai/dsh-subagent-fork-in-process` |
| `@deepseek-ai/dsh-subagent-in-process-driver` | Shared in-process subagent run driver: drives a child agent on ctx.agents (used by the spawn and fork backends) | `dsh plugin --profile myagent add @deepseek-ai/dsh-subagent-in-process-driver` |
| `@deepseek-ai/dsh-subagent-spawn-in-process` | In-process spawn subagent backend: runs a fresh child agent on ctx.agents | `dsh plugin --profile myagent add @deepseek-ai/dsh-subagent-spawn-in-process` |
| `@deepseek-ai/dsh-subagent` | Abstract subagent seam (ctx.subagents): named-provider registry for delegating to child agents | `dsh plugin --profile myagent add @deepseek-ai/dsh-subagent` |
| `@deepseek-ai/dsh-tool-subagent-control` | Globally named send_message, interrupt_agent, and list_agents tools over ctx.subagents continuations | `dsh plugin --profile myagent add @deepseek-ai/dsh-tool-subagent-control` |
| `@deepseek-ai/dsh-tool-subagent-report` | Child-scoped report tool over ctx.subagents continuations | `dsh plugin --profile myagent add @deepseek-ai/dsh-tool-subagent-report` |
| `@deepseek-ai/dsh-tool-subagent` | Model-facing subagent delegation tool over the ctx.subagents seam | `dsh plugin --profile myagent add @deepseek-ai/dsh-tool-subagent` |

## 工作流 Workflow（4）

| 插件 Plugin | 描述 Description | 安装 Install |
|---|---|---|
| `@deepseek-ai/dsh-tool-ralph` | Model-facing fresh-agent Ralph loop over the workflow and subagent seams | `dsh plugin --profile myagent add @deepseek-ai/dsh-tool-ralph` |
| `@deepseek-ai/dsh-tool-workflow` | Model-facing workflow tool: run a JavaScript orchestration script over ctx.workflowEngine | `dsh plugin --profile myagent add @deepseek-ai/dsh-tool-workflow` |
| `@deepseek-ai/dsh-workflow-worker-thread` | worker-thread workflow engine: executes model-written orchestration scripts off the host event loop, bridging agent() calls back to ctx.subagents | `dsh plugin --profile myagent add @deepseek-ai/dsh-workflow-worker-thread` |
| `@deepseek-ai/dsh-workflow` | Workflow capability seam: ctx.workflowEngine service, run vocabulary, and workflow/* events | `dsh plugin --profile myagent add @deepseek-ai/dsh-workflow` |

## 后台任务 Jobs（3）

| 插件 Plugin | 描述 Description | 安装 Install |
|---|---|---|
| `@deepseek-ai/dsh-jobs-local` | Process-local implementation of the DeepSeek Harness background job registry seam | `dsh plugin --profile myagent add @deepseek-ai/dsh-jobs-local` |
| `@deepseek-ai/dsh-jobs` | Background job registry (ctx.jobs) for the DeepSeek Harness — shared ids, owner isolation, polling, cancellation, and completion listeners for long-running tool work | `dsh plugin --profile myagent add @deepseek-ai/dsh-jobs` |
| `@deepseek-ai/dsh-tool-jobs` | Model-facing background job control tools (job_output, job_list, job_kill) over the ctx.jobs registry | `dsh plugin --profile myagent add @deepseek-ai/dsh-tool-jobs` |

## MCP 客户端（1）

| 插件 Plugin | 描述 Description | 安装 Install |
|---|---|---|
| `@deepseek-ai/dsh-mcp-client` | MCP client bridge: connects to MCP servers and registers their tools on ctx.tools | `dsh plugin --profile myagent add @deepseek-ai/dsh-mcp-client` |

## 技能 Skill（4）

| 插件 Plugin | 描述 Description | 安装 Install |
|---|---|---|
| `@deepseek-ai/dsh-skill-badge` | Bundled dsh badge skill provider for DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-skill-badge` |
| `@deepseek-ai/dsh-skill-filesystem` | Local filesystem skill provider for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-skill-filesystem` |
| `@deepseek-ai/dsh-skill` | Agent skill provider registry for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-skill` |
| `@deepseek-ai/dsh-tool-skill` | Model-facing skill loading tool for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-tool-skill` |

## 会话与持久化（21）

| 插件 Plugin | 描述 Description | 安装 Install |
|---|---|---|
| `@deepseek-ai/dsh-command-compact` | Human-facing slash command for explicit session compaction | `dsh plugin --profile myagent add @deepseek-ai/dsh-command-compact` |
| `@deepseek-ai/dsh-compaction-basic` | Token-meter-driven compaction policy and LLM summarization backend for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-compaction-basic` |
| `@deepseek-ai/dsh-compaction-tool-result-pruner` | Replay-safe model-free head/middle/tail pruning for tool-result surface nodes | `dsh plugin --profile myagent add @deepseek-ai/dsh-compaction-tool-result-pruner` |
| `@deepseek-ai/dsh-compaction` | Abstract compaction service seam (ctx.compaction) for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-compaction` |
| `@deepseek-ai/dsh-session-log-export` | Web Session-log export command and shared download dialog | `dsh plugin --profile myagent add @deepseek-ai/dsh-session-log-export` |
| `@deepseek-ai/dsh-session-query-sqlite` | Concrete ctx.sessionQuery backend with SQLite FTS5 search | `dsh plugin --profile myagent add @deepseek-ai/dsh-session-query-sqlite` |
| `@deepseek-ai/dsh-session-query` | Combined session query service contract with concrete reads, traces, and filters | `dsh plugin --profile myagent add @deepseek-ai/dsh-session-query` |
| `@deepseek-ai/dsh-tool-session-query` | Workspace-authorized model-facing session history search, trace, and event read tools | `dsh plugin --profile myagent add @deepseek-ai/dsh-tool-session-query` |
| `@deepseek-ai/dsh-session-checkpoint-policy` | Semantic session durability checkpoints before model requests and tool side effects | `dsh plugin --profile myagent add @deepseek-ai/dsh-session-checkpoint-policy` |
| `@deepseek-ai/dsh-session-persistence-jsonl` | JSONL durable session persistence backend for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-session-persistence-jsonl` |
| `@deepseek-ai/dsh-session-persistence-sqlite` | SQLite durable session persistence backend for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-session-persistence-sqlite` |
| `@deepseek-ai/dsh-session-persistence` | Abstract durable session persistence seam (ctx.sessionPersistence) for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-session-persistence` |
| `@deepseek-ai/dsh-session-projection-cache` | Persisted projection cache (ctx.sessionProjectionCache): durable per-session projection checkpoints over the domain data form, throttled write-behind, and the cold-read ladder (cache row + persistence tail replay) | `dsh plugin --profile myagent add @deepseek-ai/dsh-session-projection-cache` |
| `@deepseek-ai/dsh-session-projection` | Session-projection seam: the merge-extensible projection type table, the provider contract, and the ctx.sessionProjections registry serving whole current values of log-derived per-session state | `dsh plugin --profile myagent add @deepseek-ai/dsh-session-projection` |
| `@deepseek-ai/dsh-session-stats` | Whole-log conversation counts and wall times projection (sessionStats) for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-session-stats` |
| `@deepseek-ai/dsh-session-telemetry-otel` | OpenTelemetry backend for the DeepSeek Harness telemetry seam: hands captured session records to the OTel JS SDK's log pipeline | `dsh plugin --profile myagent add @deepseek-ai/dsh-session-telemetry-otel` |
| `@deepseek-ai/dsh-session-telemetry` | SessionTelemetryBackend seam for the DeepSeek Harness: session-event capture, projection, redaction, and handoff to a reporting backend | `dsh plugin --profile myagent add @deepseek-ai/dsh-session-telemetry` |
| `@deepseek-ai/dsh-session-title-all-prompts-llm` | All-user-messages LLM provider plugin for DeepSeek Harness session titles | `dsh plugin --profile myagent add @deepseek-ai/dsh-session-title-all-prompts-llm` |
| `@deepseek-ai/dsh-session-title-first-prompt-llm` | First-message LLM provider plugin for DeepSeek Harness session titles | `dsh plugin --profile myagent add @deepseek-ai/dsh-session-title-first-prompt-llm` |
| `@deepseek-ai/dsh-session-title-llm` | Shared LLM generation policy for DeepSeek Harness session-title providers | `dsh plugin --profile myagent add @deepseek-ai/dsh-session-title-llm` |
| `@deepseek-ai/dsh-session-title` | Log-backed session title service and provider registry for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-session-title` |

## 计划·目标·待办（6）

| 插件 Plugin | 描述 Description | 安装 Install |
|---|---|---|
| `@deepseek-ai/dsh-command-goal` | Human-facing slash command for persisted same-session goals | `dsh plugin --profile myagent add @deepseek-ai/dsh-command-goal` |
| `@deepseek-ai/dsh-goal-round-driver` | Race-fenced same-session goal-round driver | `dsh plugin --profile myagent add @deepseek-ai/dsh-goal-round-driver` |
| `@deepseek-ai/dsh-goal` | Event-sourced same-session goal state and lifecycle service for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-goal` |
| `@deepseek-ai/dsh-tool-goal` | Model-facing same-session goal tools with execution-time authority checks | `dsh plugin --profile myagent add @deepseek-ai/dsh-tool-goal` |
| `@deepseek-ai/dsh-plan-mode` | Logged per-agent plan mode with deployment guidance, a direct slash command, and a user-reviewed exit | `dsh plugin --profile myagent add @deepseek-ai/dsh-plan-mode` |
| `@deepseek-ai/dsh-tool-todo` | Model-facing todo_write tool over the DeepSeek Harness event-sourced session log | `dsh plugin --profile myagent add @deepseek-ai/dsh-tool-todo` |

## 上下文 Context（4）

| 插件 Plugin | 描述 Description | 安装 Install |
|---|---|---|
| `@deepseek-ai/dsh-agent-instructions` | Workspace context loader for AGENTS.md/CLAUDE.md instruction files | `dsh plugin --profile myagent add @deepseek-ai/dsh-agent-instructions` |
| `@deepseek-ai/dsh-session-reference` | Cross-session snapshot references and durable untrusted model context (ctx.sessionReferenceResolver) | `dsh plugin --profile myagent add @deepseek-ai/dsh-session-reference` |
| `@deepseek-ai/dsh-time-context` | Opt-in durable per-step context with the current time and elapsed time | `dsh plugin --profile myagent add @deepseek-ai/dsh-time-context` |
| `@deepseek-ai/dsh-tmux-context` | Opt-in durable per-step context with this agent's tmux pane and window location | `dsh plugin --profile myagent add @deepseek-ai/dsh-tmux-context` |

## LLM 与提供商（5）

| 插件 Plugin | 描述 Description | 安装 Install |
|---|---|---|
| `@deepseek-ai/dsh-llm-deepseek` | DeepSeek chat-completions adapter for the DeepSeek Harness LLM seam | `dsh plugin --profile myagent add @deepseek-ai/dsh-llm-deepseek` |
| `@deepseek-ai/dsh-llm-pi-ai` | pi-ai-backed DeepSeek adapter for the DeepSeek Harness LLM seam (design-verification twin of dsh-llm-deepseek) | `dsh plugin --profile myagent add @deepseek-ai/dsh-llm-pi-ai` |
| `@deepseek-ai/dsh-llm-retry` | Provider-routed LLM request retry policy for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-llm-retry` |
| `@deepseek-ai/dsh-llm` | Provider-neutral LLM service interface for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-llm` |
| `@deepseek-ai/dsh-token-meter` | Replay-aware token measurement service (ctx.tokenMeter) for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-token-meter` |

## 沙箱与安全（4）

| 插件 Plugin | 描述 Description | 安装 Install |
|---|---|---|
| `@deepseek-ai/dsh-sandbox-local` | Local process-sandbox backends for the DeepSeek Harness sandbox seam: bwrap, the npm-distributed landlock-run launcher, macOS Seatbelt, or the Windows ACL restricted-token runner — functionally probed, fail-closed | `dsh plugin --profile myagent add @deepseek-ai/dsh-sandbox-local` |
| `@deepseek-ai/dsh-sandbox-policy` | Per-call sandbox policy resolver and current model context: deployment fallbacks plus each session's mode and workspace root, shared by every enforcing capability family | `dsh plugin --profile myagent add @deepseek-ai/dsh-sandbox-policy` |
| `@deepseek-ai/dsh-sandbox-windows-acl` | Windows ACL write-restriction sandbox backend (restricted-token spawn with capability-SID write allowlist) for the DeepSeek Harness sandbox seam | `dsh plugin --profile myagent add @deepseek-ai/dsh-sandbox-windows-acl` |
| `@deepseek-ai/dsh-sandbox` | Abstract process-sandbox seam (ctx.sandbox) for the DeepSeek Harness: same-world confinement vocabulary and the SandboxProvider contract | `dsh plugin --profile myagent add @deepseek-ai/dsh-sandbox` |

## 交互与权限（5）

| 插件 Plugin | 描述 Description | 安装 Install |
|---|---|---|
| `@deepseek-ai/dsh-commands` | Plugin-owned human command registry for DeepSeek Harness UIs | `dsh plugin --profile myagent add @deepseek-ai/dsh-commands` |
| `@deepseek-ai/dsh-permission-presets` | User-facing permission presets (ctx.permissionPresets) for the DeepSeek Harness: one product-level Permissions select bundling the sandbox-mode and approval-policy knobs, written through to their own session events | `dsh plugin --profile myagent add @deepseek-ai/dsh-permission-presets` |
| `@deepseek-ai/dsh-tool-ask-user` | Model-facing ask_user_question tool over the ctx.userQuestions seam | `dsh plugin --profile myagent add @deepseek-ai/dsh-tool-ask-user` |
| `@deepseek-ai/dsh-user-approval` | User-approval seam (ctx.approval) for the DeepSeek Harness: one-shot permission decisions dispatched to composed answerers over the approval/request waterfall, fail-closed by default | `dsh plugin --profile myagent add @deepseek-ai/dsh-user-approval` |
| `@deepseek-ai/dsh-user-questions` | Abstract user-questions seam (ctx.userQuestions) for asking the human during agent runs | `dsh plugin --profile myagent add @deepseek-ai/dsh-user-questions` |

## 配置与凭证（4）

| 插件 Plugin | 描述 Description | 安装 Install |
|---|---|---|
| `@deepseek-ai/dsh-credentials-local` | File-backed credentials provider ($DSH_HOME/.env under the live process environment) for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-credentials-local` |
| `@deepseek-ai/dsh-credentials` | Abstract credential seam (ctx.credentials): settings carry references to secrets, providers own the values | `dsh plugin --profile myagent add @deepseek-ai/dsh-credentials` |
| `@deepseek-ai/dsh-settings-file` | File-backed settings provider (settings.yaml) for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-settings-file` |
| `@deepseek-ai/dsh-settings` | Abstract user-settings seam (ctx.settings) for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-settings` |

## 守护与质量（4）

| 插件 Plugin | 描述 Description | 安装 Install |
|---|---|---|
| `@deepseek-ai/dsh-command-feedback` | Log-only session feedback producer and human-facing slash command | `dsh plugin --profile myagent add @deepseek-ai/dsh-command-feedback` |
| `@deepseek-ai/dsh-message-feedback` | Lifecycle-bound per-message rating and note sidecar for the DeepSeek Harness | `dsh plugin --profile myagent add @deepseek-ai/dsh-message-feedback` |
| `@deepseek-ai/dsh-repeat-tool-reminder` | Repeat-tool-call guard plugin: advisory reminders when an agent loops on identical tool calls | `dsh plugin --profile myagent add @deepseek-ai/dsh-repeat-tool-reminder` |
| `@deepseek-ai/dsh-tool-call-timeout-policy` | Tool-call timeout policy: a tools/execute wrapper that arms a per-tool deadline on exec.signal and returns TOOL_TIMEOUT when it wins | `dsh plugin --profile myagent add @deepseek-ai/dsh-tool-call-timeout-policy` |

## 集成与桥接（7）

| 插件 Plugin | 描述 Description | 安装 Install |
|---|---|---|
| `@deepseek-ai/dsh-acp` | Automation-only Agent Client Protocol server for driving DeepSeek Harness agents over JSON-RPC stdio | `dsh plugin --profile myagent add @deepseek-ai/dsh-acp` |
| `@deepseek-ai/dsh-hook-protocol` | Shared Claude Code / Codex hook wire protocol: matcher engine, stdin/exit-code/stdout codec, multi-hook merge, and hook/* session events | `dsh plugin --profile myagent add @deepseek-ai/dsh-hook-protocol` |
| `@deepseek-ai/dsh-hooks-claude-code` | Bridge plugin: run a Claude Code hooks.json / settings hook config on the DeepSeek Harness interception seams | `dsh plugin --profile myagent add @deepseek-ai/dsh-hooks-claude-code` |
| `@deepseek-ai/dsh-hooks-codex` | Bridge plugin: run a Codex hooks.json hook config on the DeepSeek Harness interception seams | `dsh plugin --profile myagent add @deepseek-ai/dsh-hooks-codex` |
| `@deepseek-ai/dsh-sdk-client` | TypeScript client SDK for driving a DeepSeek Harness runtime subprocess over stdio JSON-RPC: the DeepSeekHarness high-level turns API and the lower-level HarnessClient | `dsh plugin --profile myagent add @deepseek-ai/dsh-sdk-client` |
| `@deepseek-ai/dsh-sdk-protocol` | Shared wire protocol for the DeepSeek Harness SDK runtime: the newline-delimited JSON-RPC stdio transport and the named request, result, and notification types spoken between the runtime server and SDK clients | `dsh plugin --profile myagent add @deepseek-ai/dsh-sdk-protocol` |
| `@deepseek-ai/dsh-sdk-jsonrpc-server` | Stdio JSON-RPC server plugin for out-of-process DeepSeek Harness SDK clients | `dsh plugin --profile myagent add @deepseek-ai/dsh-sdk-jsonrpc-server` |


## 内置运行时组件 · Built-in runtime

`host` / `client` / `boot` / `api` / `typert` / `storage` / `preset` / `identity` / `attachment` / `spill` / `workspace` / `extensions` / `runtime-diagnostics` / `e2b` 等组的插件由 `@deepseek-ai/dsh-web-app` bundle 组装，**通常无需单独安装**；需要定制时再按需添加。

## 维护 · Maintenance

- 数据来源：上游 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) 仓库 `packages/` 目录
- 重新生成：遍历 `packages/*/*/package.json`，按 `packages/README.md` 分组映射到能力分类
- 上游版本：`@deepseek-ai/dsh@0.1.0-rc.x`（快速演进中，安装前请确认兼容性）
