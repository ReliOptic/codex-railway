# ReliOptic Linux Codex development runtime v1

This branch is a managed fork of upstream cf101bf07f86a2ecf149db25cd80cdcfe476598a.
Codex CLI 0.160.1 is pinned. Node 22.23.3 official base image is pinned by OCI digest.
Python 3, venv, git, OpenSSH, tmux and shellcheck are installed.

## Railway
- Root directory: /codex. Dockerfile: Dockerfile.
- Attach a persistent volume at /workspace before deployment.
- Do not generate a public domain or TCP proxy. No HTTP terminal is served.
- Use Railway Console or railway ssh. Main process is sleep infinity; tmux session is codex.
- Register the PUBLIC key printed once per boot as a read-only Deploy Key on Campsite-for-duo.
- Set DUO_VERIFY_ON_BOOT=1. Boot clones only when authorised and never resets existing work.
- Authenticate interactively with codex login --device-auth. Never share device codes or tokens in chat.
- Work directory: /workspace/repos/Campsite-for-duo. Commands: duo-dev init, duo-dev test, duo-dev status.

## Scope and safety
- Read-only GitHub access initially: no push, merge, PR write or administrative permissions.
- Work on a fresh task branch. Review all diffs and test results before granting write access.
- No automatic npm/Codex update at boot. Rebuild only from a reviewed version change.
- Root-compatible Railway SSH runtime. Codex uses danger-full-access inside the container; approvals are not a guaranteed security boundary.
- Codex auth/session and generated SSH key persist in /workspace; restrict Railway project access.
- No passwords are generated or printed. No service secrets are copied into /etc/profile.d.
- Linux tests do not establish Apple build/Simulator/physical-device correctness. Run those on Mac/Xcode.
- App server stays loopback-only. This is not a production Campsite deployment.
- Image rollback does not restore volume data. Back up the volume with restricted access separately.

## Release control
Keep upstream main separate from this managed branch. Record the exact deployed commit SHA.
Disable automatic deployments after the initial successful verification. A future upgrade requires a new reviewed commit and manual deployment; production image-digest promotion can be added separately.
