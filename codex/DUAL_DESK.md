# AI 작업실: Codex + Claude Code + Shell

This branch adds an authenticated, resizable web terminal dashboard to the existing Codex Railway service. It does not modify `main` or `relioptic-linux-v1`.

## Versions

- Codex 0.160.1
- Claude Code 2.1.291, automatic updates disabled
- Node 22, immutable image digest pinned in Dockerfile
- ttyd 1.7.7, official amd64/arm64 binaries pinned with SHA-256

## Railway settings

- Source: this branch, root directory `/codex`
- Dockerfile: `Dockerfile`
- Start command: empty, use the Dockerfile ENTRYPOINT
- Public target port: 8080 (or Railway's PORT value)
- Health check: `/healthz`
- Preserve the existing volume mounted at `/workspace` and all existing credentials.
- Required: `CODEX_WEB_PASSWORD`
- Username: `CODEX_WEB_USERNAME`, default `admin`
- Do not copy passwords, API keys, tokens or auth files into GitHub.

## UI and sessions

Default: two panels, Codex and Claude. Select three panels to add Shell. Every panel can independently select Codex, Claude or Shell. Drag separators with mouse or touch, or use arrow keys. Switch columns/rows, reconnect a single panel, and maximize a panel. Layout preferences remain in browser localStorage; credentials never do.

The nine possible slot/agent combinations use independent tmux sessions. Only panels that have been opened start CLI sessions. Closing/reloading/switching the iframe detaches the browser but preserves the CLI session. Redeploying a container restarts processes, not files or login data.

- Workspace files: `/workspace/repos`
- Codex settings/auth: `/workspace/codex`
- Claude settings/auth: `/workspace/claude`
- Codex always launches with `--ask-for-approval on-request`.
- Claude launches with its normal permission policy. Permission bypass flags are not used.

The gateway protects the dashboard, terminal HTML and WebSocket endpoints with the existing Basic Auth credentials. ttyd binds only to loopback. Cross-origin WebSocket upgrades are rejected. `/healthz` exposes only `ok`. No terminal output or credentials are written to deployment logs.

Both agents can edit the same filesystem. For simultaneous edits to the same repository, use separate Git worktrees to avoid conflicting changes. iOS builds still require a Mac/Xcode.

Claude subscription authentication is separate from ChatGPT. Complete Claude's CLI login with the intended Claude account. Do not paste access tokens into chat or source code.
