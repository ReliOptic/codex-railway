#!/bin/sh
set -eu
slot="${1:-}"
agent="${2:-}"
case "$slot" in 1|2|3|4|5|6|7|8) ;; *) exit 64 ;; esac
case "$agent" in codex|claude|shell) ;; *) exit 64 ;; esac
export CODEX_HOME="${CODEX_HOME:-/workspace/codex}"
export CLAUDE_CONFIG_DIR="${CLAUDE_CONFIG_DIR:-/workspace/claude}"
session="desk-${slot}-${agent}"
workdir=/workspace/repos
# Claude is for public-classified material only; private repositories stay outside its default directory.
if [ "$agent" = claude ]; then workdir=/workspace/public; fi
mkdir -p "$workdir"
if ! tmux has-session -t "$session" 2>/dev/null; then
  case "$agent" in
    codex) tmux new-session -d -s "$session" -c "$workdir" 'codex --ask-for-approval on-request' ;;
    claude) tmux new-session -d -s "$session" -c "$workdir" 'claude' ;;
    shell) tmux new-session -d -s "$session" -c "$workdir" 'bash -l' ;;
  esac
fi
# Disconnecting or switching the iframe detaches this client, not the CLI session.
exec tmux attach-session -t "$session"
