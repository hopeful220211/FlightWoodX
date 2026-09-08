# 前端自动发布

> 状态：实现与本地隔离检查已完成；GitHub 配置已建立，首次服务器安装和真实发布待验证
>
> 更新时间：2026-09-08
>
> 适用范围：此 GitHub 仓库到 FlightWoodX 现有 ECS 的前端发布
>
> 替代关系：日常前端发布使用本文流程，替代手动运行 `deploy/deploy.sh`；API、数据库、系统权限、证书和部署器自身升级仍需单独授权及验证

## 使用方法

工作在独立 `codex/` 分支，保留当前生产分支的历史。用户要求发布时：

1. 运行项目检查，将改动提交并推送开发分支。
2. 核对该确切 SHA 的 8 个 CI 作业全部通过。不能用旧提交或别的分支的结果代替。
3. 确认 `production` 仍是所基于的生产版本；只做普通 fast-forward 推送，不强推、不绕过保护。
4. `production` 推送触发 CI；浏览器测试后的同一份构建归档在所有检查成功后发送到 ECS。不从服务器当前 Git 分支拉取或重新构建。
5. 等待 `Publish tested frontend` 成功，核对正式网址、`release.json` 的 SHA、入口摘要与实际修改；更新 `CURRENT_STATUS.md`。GitHub 绿色不代替人工页面验收。

GitHub CLI 示例（在已验证、干净的目标开发工作树，且 HEAD 的检查全部通过后）：

```bash
git fetch origin production
git merge-base --is-ancestor origin/production HEAD
git push origin HEAD:production
gh run list --branch production --limit 3
```

`production` 是独立发布分支，默认分支仍为 `main`，不将历史 main 或任意开发分支自动合并上线。生产环境名为 `ecs-production`，部署分支只允许 `production`；分支保护要求 8 个工程/浏览器/容器检查，管理员同样受限，禁止强推与删除。部署的并发组不取消正在切换的版本。普通开发分支不能获取生产密钥。

## 首次安装

由管理员在已有 Workbench root 终端执行一次经过审查的安装指令。必须把本目录的 `bootstrap.py`、`server.py` 和 `production_ed25519.pub` 下载到全新的 root 独占目录，绑定确切 Git 提交并逐文件校验 SHA-256；然后运行：

```bash
python3 -I bootstrap.py --public-key production_ed25519.pub --server-source server.py
```

不要直接从浮动分支下载后以 root 执行。公钥可公开，不含私钥。初始化前预检三个现有容器、权限、网络、端口、证书和挂载；出现已有目标目录/账号则停止，不覆盖或自动修复。安装中如失败，保留新建部分并交由管理员核对，不盲目重跑。

安装创建的唯一账号是 `fwx-deploy`，只允许本项目固定部署程序；不改现有 root 密钥或密码，不授予 Docker 组/任意 sudo，不调整 SSH 端口、防火墙、阿里云安全组、数据库或上传卷。安装本身不切换网站。安装完成后必须实测 `status`、拒绝任意命令/PTY/转发、第一次发布、API/Mongo 身份保持和真实回退。

## 凭据与信任边界

GitHub `ecs-production` 环境保存：

| 类型 | 名称 | 用途 |
| --- | --- | --- |
| Secret | `SSH_KEY` | 此次专用 Ed25519 私钥，不能进入源码、日志、归档或聊天 |
| Secret | `SSH_KNOWN_HOSTS` | 已核实的服务器主机公钥，连接时强制验证，不接受自动信任新主机 |
| Variable | `FWX_DEPLOY_HOST` | 当前服务器 `8.156.92.182` |
| Variable | `FWX_DEPLOY_PORT` | 当前端口 `22` |

密钥只进入执行发布那一步；客户端不转发传输原始日志，临时密钥文件权限 0600 并在结束后清理。生产分支写权限、部署工作流和此密钥都属于敏感权限：拥有部署权限仍可替换前端 JS，进而危害站内用户，不能把受限账号描述成没有安全影响。

定期轮换专用密钥时，先由管理员更新公钥并验证新钥匙，再替换 GitHub Secret；撤销时移除该账号的授权公钥并停用环境密钥。不要公开服务器或账号凭据。用户需要处理的异常包括凭据撤销/轮换、主机身份变化、磁盘不足及真实回退失败，不承诺永远无需维护。

## 服务器布局与回退

| 路径 | 职责 |
| --- | --- |
| `/usr/local/libexec/flightwoodx-release` | root-owned Python 固定发布器，隔离解释器、无上传代码执行 |
| `/etc/flightwoodx-deploy` | root-only Compose 配置快照、状态/事务记录和并发锁；不包含 API 凭据 |
| `/var/lib/flightwoodx-deploy` | root-owned 专用账号目录及强制命令公钥 |
| `/var/lib/flightwoodx-releases` | root-owned 全新候选目录；旧正式目录和前一版本保留 |
| `/etc/sudoers.d/flightwoodx-deploy` | 只允许固定发布器的三个操作 |

SSH 协议只接受 `status`、`publish <40位SHA> <64位归档摘要>`（归档从标准输入读取）和 `rollback <当前40位SHA>`。不提供交互 shell、任意路径访问、任意 Docker 或数据库操作。包内只允许常规公开文件和目录；拒绝隐藏内容、链接、重复路径、目录穿越和稀疏文件。仅忽略空 `.gitkeep` 源码占位；非空隐藏文件仍拒绝。现有 CAD 占位文件已清空而未删除目录，制造源仍未补齐。

构建归档上限 256 MiB、展开内容 512 MiB、文件及隐式目录 10000 项、路径 32 层。发布前额外预留 1 GiB 数据库/系统余量，不自动删除旧版本换取空间。

候选先校验全部文件摘要、权限和 nginx 配置，固定已运行的 nginx 镜像 ID（不拉新镜像）。仅重建 nginx，原网络、80/443、证书和 ACME 目录保持，API/Mongo 不重建。此切换可能短暂断开连接，不称零停机。

切换后服务器校验正式首页/工作台路由、入口 JS/CSS、三奖图片、模型/缩略图/纹理和 API 健康；GitHub 客户端另核验正式版本及入口字节。失败自动回到上一目录并重新检查，作业仍报告失败。`rollback <SHA>` 只对当前 SHA 生效，不能把迟到作业的回退施加给更新版本。

事务状态先写 `pending` 再切换；SSH 断开不会主动中止切换，意外中止留下待恢复记录。后续写操作先恢复到记录的旧目录；外部人工修改了 live 挂载时停止，不覆盖它。状态 `ready:false` 或回退未确认时要求管理员核对，不宣称成功。旧产物保留在服务器，GitHub 测试归档保留 3 天；没有定期异机备份承诺。

网络回执丢失时，本次作业仍报告未确认。重跑同一 SHA 会重新接收并校验归档，比较当前完整文件与候选清单、线上响应及后台身份；一致才确认成功，不重新切换 nginx，不改变上一版本。同一 SHA 的不同内容或已损坏文件直接拒绝。

部署器/配置/后端升级不能夹带在静态包里自动执行，须另行授权并安装经过验证的版本。

## 验证与证据

- `node --test scripts/web-release*.test.mjs`：归档与坏输入、受限 SSH、密钥文件权限/清理、工作流限制、真实解包及发布/回退故障模拟。
- `python3 -B deploy/automation/test_server.py` 和 `test_bootstrap.py`：隔离临时文件、模拟容器；不能代替真实 ECS 验收。
- `pnpm run harness`、完整 `pnpm run ci` 和当前提交的 GitHub 作业仍为必经检查。
- 远端既有 `Tests` 作业固定 Python 3.10，覆盖当前 Ubuntu 22.04 服务器解释器版本；不能只用本机较新 Python 的结果证明兼容。
- 当前实际配置/安装/上线结果见 [CURRENT_STATUS.md](../../CURRENT_STATUS.md) 和[实施记录](../../docs/exec-plans/active/2026-09-08-automated-web-release.md)。

依据：[GitHub 部署环境](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/control-deployments)、[环境 Secrets](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)、[OpenSSH 强制命令限制](https://man.openbsd.org/sshd.8)。
