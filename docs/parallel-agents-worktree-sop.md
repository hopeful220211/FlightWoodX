# 多 Agent 并行协作 SOP — git worktree 隔离

> 适用：同时让多个 Claude Code / 工程师 agent 在本仓库并行开发时。
> 状态：2026-06-16 事故后确立。**这是硬约定，优先于"图方便"。**

---

## 0. 为什么有这份文档（2026-06-16 事故复盘）

当天三个 agent 在**同一个工作目录** `/Users/nesty/Projects/flightwoodx` 并行：
- A = `feat/m5-project-hub`（项目枢纽）
- B = `feat/m5.5-share`（分享/嵌入）
- C = `feat/growth-system-e4`（E4 成长体系）

出了两类问题：

1. **HEAD 串台**：C 切到自己分支后，另一个会话把共享 HEAD 切走，导致 C 的 commit 落到了 A 的 `feat/m5-project-hub` 分支上。**侥幸在 push 前发现并无损修复**（`git branch -f` 归位），否则会污染 A 的分支。
2. **WIP 混合**：163 个未提交文件混在同一个工作区，分不清谁的。C 要做"独立 PR"时，三个共享文件（`index.ts` / `App.tsx` / `Navbar.tsx`）里 C 的 4 行接线与 A/B 的 WIP **行级交织**，无法干净剥离，最终被迫连带提交了他人 WIP。

**根因**：N 个 agent 共享 1 个工作目录 = 共享 1 个 HEAD + 1 个工作区。Git 的工作目录本就不是为并发设计的。这不是谁操作失误，是 setup 本身的缺陷，会一次次复发。

---

## 1. 推荐方案：每个 agent 一个 git worktree

`git worktree` 让同一个仓库 checkout 出**多个独立工作目录**，各有独立 HEAD 和独立工作区，但共享同一个 `.git`（分支、对象、历史完全互通）。这正好消除上面两个根因。

### 目录布局

```
/Users/nesty/Projects/
  flightwoodx/        ← 主仓库：只停在 feat/platform-2.0 作共享基线，不在此直接编码
  fwx-A-m5/           ← 工程师 A 的 worktree（feat/m5-project-hub）
  fwx-B-share/        ← 工程师 B（feat/m5.5-share）
  fwx-C-growth/       ← 工程师 C（feat/growth-system-e4）
```

### 建 worktree（每个分支一次）

```bash
# 已有分支
git worktree add ../fwx-C-growth feat/growth-system-e4
# 新分支从基线切出
git worktree add -b feat/new-x ../fwx-X-new feat/platform-2.0
```

### 每个 agent 启动时

```bash
cd /Users/nesty/Projects/fwx-C-growth   # 进自己的 worktree
# 在此读写、commit、push，与其他 agent 零干扰；不要 cd 回主仓库
```

### 常用命令

```bash
git worktree list                      # 列出所有 worktree 及其 HEAD
git worktree remove ../fwx-C-growth    # 用完移除（分支与历史保留）
git worktree prune                     # 清理已被删目录的失效记录
```

> ⚠️ 同一个分支不能同时在两个 worktree checkout。每个分支只属于一个 worktree。

---

## 2. 从当前混合状态迁移（需要协调，逐人执行）

当前主目录有 163 个混合 WIP，且 A 的 `m5-project-hub`、B 的 `m5.5-share` 很可能尚未 commit。迁移要点：

1. **先暂停所有 agent 会话**，避免迁移期间继续往主目录写。
2. **逐工程师把自己的改动落到自己分支**。文件归属可借各自 RFC 的"只动文件"清单判定（例：growth 只动 `pages/Me/Growth/`、`stores/growthStore.ts`、`packages/shared/src/growth*`）。
   ```bash
   # 在主目录，对自己的文件：
   git add <自己的文件...> && git commit -m "..."   # 落到当前分支
   # 或先 stash 自己的，给别人腾干净工作区
   git stash push -- <自己的文件...>
   ```
3. 各自分支 commit 干净后，主目录切回基线：`git checkout feat/platform-2.0`。
4. 为每个分支建 worktree（见 §1），各 agent 进各自 worktree 继续。

> 若 WIP 实在分不清归属：最稳妥是按文件路径归属逐个 `git add` 提交，剩余无主文件保留在主目录由人工裁定。**切勿用 `git checkout -- <file>` / `reset --hard`**，那会抹掉他人未提交的工作。

---

## 3. Fallback：一次只跑一个 agent

不想用 worktree 时的兜底：**约定同一时刻只有一个 agent 在主目录工作**，串行推进。
- 优点：零额外机制，绝不串台。
- 缺点：失去并行速度。
- 适合：任务相互依赖强、或暂不熟悉 worktree 时。

---

## 4. 建议写进 CLAUDE.md 的硬约定

在 §3.0 分工章节或 §3.5 红线加一条：

> **多 agent 并行必须用 git worktree 隔离**（每个 agent 独立工作目录），**禁止多个 agent 共享同一工作目录**；无法用 worktree 时，退化为"一次只跑一个 agent"。派发 agent 时，在任务说明开头注明其 worktree 路径，并要求其所有操作在该目录内进行、不要 cd 回主仓库。

---

## 5. 派 agent 时任务说明里加的一句话（模板）

> 你的工作目录是 `/Users/nesty/Projects/fwx-<X>-<feature>`（git worktree，分支 `feat/<...>`）。所有读写、commit、push 都在此目录内进行，**不要 cd 到主仓库 `/Users/nesty/Projects/flightwoodx`**，以免与其他并行 agent 串台。

---

*本文件即用 worktree 隔离写成：在 `/Users/nesty/Projects/fwx-sop`（分支 `docs/parallel-agents-sop`）创建，全程未触碰主目录的 HEAD 与 163 个 WIP——这就是该机制有效性的现场证明。*
