#!/bin/sh
set -eu
umask 077
# Prefer the immutable image's pinned CLI versions over legacy volume-installed tools.
export PATH=/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/bin:/sbin
export CODEX_HOME="${CODEX_HOME:-/workspace/codex}"
export CLAUDE_CONFIG_DIR="${CLAUDE_CONFIG_DIR:-/workspace/claude}"
export TERM=xterm-256color
mkdir -p /workspace/repos "$CODEX_HOME" "$CLAUDE_CONFIG_DIR"
chmod 700 "$CODEX_HOME" "$CLAUDE_CONFIG_DIR"
if [ ! -e "$CODEX_HOME/config.toml" ]; then
  cp /opt/codex/config.toml.default "$CODEX_HOME/config.toml"
  chmod 600 "$CODEX_HOME/config.toml"
fi
# Preserve existing Codex/Claude authentication. Never rewrite or print credentials.
cat > /etc/profile.d/99-ai-desk.sh <<'PROFILE'
export PATH=/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/bin:/sbin
export CODEX_HOME=/workspace/codex
export CLAUDE_CONFIG_DIR=/workspace/claude
export TERM=xterm-256color
PROFILE
chmod 644 /etc/profile.d/99-ai-desk.sh
# Older Claude versions sometimes keep this preference file directly under HOME.
# Persist it too, without touching an existing credential/configuration file.
if [ ! -e /root/.claude.json ] && [ ! -L /root/.claude.json ]; then
  ln -s "$CLAUDE_CONFIG_DIR/.claude.json" /root/.claude.json
fi
exec node /opt/ai-desk/desk-server.cjs
