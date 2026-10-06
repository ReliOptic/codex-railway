# AI 작업실 Studio v2

## Architecture and scope

Studio adds a browser window manager around the existing authenticated ttyd/tmux gateway. It is not a hosted imitation of Codex or Claude Code: terminal panes still connect to the actual pinned CLIs. It does not modify `main`, the immutable container image digest, account credentials, the persistent volume, or Codex's `on-request` approval policy.

- Free canvas windows: drag, corner resize, keyboard adjustments, front ordering, minimize tray, focus mode and close.
- Layout modes: free, side-by-side, grid and focus. Rearrangement and minimization preserve the existing terminal iframe rather than recreating a CLI connection.
- Feature palette: Codex, Claude, Shell, notes, checklist and custom HTML widget.
- Up to eight simultaneous terminal windows with distinct slots 1 through 8. Each slot can select Codex, Claude or Shell.
- Browser-local named workspaces, automatic state persistence, JSON import/export and migration of the previous split-view preferences.
- Responsive stacked windows on narrow mobile displays.

## Sessions and files

- Codex and Shell working directory: `/workspace/repos`.
- Claude's default directory: `/workspace/public`, for public-classified material only.
- Codex account/config: `/workspace/codex`; Claude account/config: `/workspace/claude`.
- CLI sessions are independent tmux sessions named `desk-{slot}-{agent}`.
- Closing or switching a terminal window detaches the browser; it does not terminate the tmux session. Switching roles can leave the prior role's session running. Avoid opening unnecessary simultaneous coding agents.
- A redeployment restarts container processes and tmux sessions. Persistent files and login data remain on the existing `/workspace` volume. Resume CLI history as appropriate after a deployment.
- The Claude public directory is a safer default, NOT an operating-system isolation boundary. Do not give Claude private Campsite repository paths, contents, secrets or non-public business data.

## Local widgets and privacy

Notes, checklist text, HTML widget code and layout preferences are stored only in this browser's localStorage. They are not saved to the Railway volume or synchronized between devices. JSON export includes this local content, so treat export files accordingly. Authentication credentials are never read into, or stored by, the layout manager.

A custom HTML widget runs in an iframe with `sandbox="allow-scripts"`, without same-origin access, popups, forms, downloads or parent-navigation privileges. An additional CSP blocks network requests, nested frames, form submission and arbitrary image/font sources. Inline HTML/CSS/JavaScript can implement a local timer, calculator or simple interaction. There is no privileged message bridge or server command API. A widget cannot run server shell commands or access server files.

The gateway continues to protect dashboard, terminal HTTP and WebSocket endpoints with Basic Auth. ttyd binds to loopback only. Cross-origin WebSocket upgrades are rejected. `/healthz` returns only `ok`. Terminal output and credentials are not sent to deployment logs.

## Native Claude Code Mods

Official Mods are JavaScript/TypeScript handlers running INSIDE Claude Code. They can draw panes, tabs, buttons and fields, but do not automatically create browser desktop windows. Terminal Mods require CLI 2.1.287+, so pinned 2.1.291 is in the supported version range.

Studio's HTML widgets are browser-local extensions, not native Claude Mods. This release does not install third-party Mods, invoke model requests, override approvals or activate a paid Claude plan. Native Mods should be added in a separate reviewed phase, preferably read-only observational UI without permission/approval hooks, automatic prompt submission or outbound data transmission.

References:
- https://code.claude.com/docs/en/plugins/mods/overview
- https://code.claude.com/docs/en/plugins/mods/interface
- https://code.claude.com/docs/en/plugins/mods/create

## Deployment and rollback

- Source release branch: `relioptic-studio-v2`, derived from `relioptic-ai-desk-v1.1`.
- Preserve service `codex`, root `/codex`, domain, `/workspace` volume, Basic Auth variables, runtime versions and image digest.
- Keep Railway auto deploy disabled; deploy the reviewed release commit explicitly.
- Healthcheck: `/healthz`; start command remains the Dockerfile default.
- Previous rollback source: `relioptic-ai-desk-v1.1`, commit `d42fc9ac32b83a6521e08fe5c025ac4d50ab29de`.
- No API-key purchase, subscription upgrade, account replacement or secret publication is part of this release.

## Acceptance checks

Verify free drag/resize with both pointer and mouse events; keyboard adjustments; window ordering; presets without iframe remount; minimize/restore/focus; additional terminal slots; note/checklist persistence; custom-widget execution and isolation; named save/load and validated import/export; mobile width without horizontal overflow; live terminal connection; preserved volume/account/approval settings and deployment SHA.
