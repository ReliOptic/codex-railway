#!/bin/bash
set -euo pipefail
umask 077
export CODEX_HOME=/workspace/codex
mkdir -p /workspace/codex /workspace/repos /workspace/.ssh /workspace/logs
chmod 700 /workspace/codex /workspace/.ssh
[ -L /root/.codex ] || rm -rf /root/.codex
ln -sfn /workspace/codex /root/.codex
ln -sfn /workspace/.ssh /root/.ssh
if [ ! -f "$CODEX_HOME/config.toml" ]; then
    cp /opt/codex/config.toml.default "$CODEX_HOME/config.toml"
fi
chmod 600 "$CODEX_HOME/config.toml"
# No public web terminal. No passwords/tokens printed or copied to shell profiles.
rm -f /etc/profile.d/00-codex-env.sh
printf 'export CODEX_HOME=/workspace/codex
export TERM=xterm-256color
export LANG=en_US.UTF-8
cd /workspace/repos
' > /etc/profile.d/00-codex-runtime.sh
chmod 644 /etc/profile.d/00-codex-runtime.sh
rm -rf "$CODEX_HOME/shell_snapshots" "$CODEX_HOME/packages"
if [ ! -f /workspace/.ssh/id_ed25519 ]; then
    ssh-keygen -t ed25519 -C 'relioptic-codex-linux-readonly' -f /workspace/.ssh/id_ed25519 -N '' -q
fi
chmod 600 /workspace/.ssh/id_ed25519
chmod 644 /workspace/.ssh/id_ed25519.pub
# Pin GitHub host keys obtained over authenticated HTTPS, not blind ssh-keyscan.
if curl -fsS --connect-timeout 10 --max-time 30 --retry 2 https://api.github.com/meta | python3 -c 'import json,sys; m=json.load(sys.stdin); keys=m["ssh_keys"]; assert keys; print("\n".join("github.com "+k for k in keys))' > /workspace/.ssh/known_hosts.new; then
    mv /workspace/.ssh/known_hosts.new /workspace/.ssh/known_hosts
    chmod 600 /workspace/.ssh/known_hosts
else
    rm -f /workspace/.ssh/known_hosts.new
    printf '[boot] GitHub host-key refresh unavailable; keeping existing keys. Strict checking remains enabled.\n'
fi
printf 'Host github.com
  HostName github.com
  User git
  IdentityFile /workspace/.ssh/id_ed25519
  IdentitiesOnly yes
  StrictHostKeyChecking yes
' > /workspace/.ssh/config
chmod 600 /workspace/.ssh/config
if ! tmux has-session -t codex 2>/dev/null; then
    tmux new-session -d -s codex -c /workspace/repos
fi
printf '[boot] private SSH-only Linux development environment
'
node --version
python3 --version
codex --version
printf '[boot] GitHub read-only deploy PUBLIC key follows (not a private key):
'
cat /workspace/.ssh/id_ed25519.pub
if GIT_SSH_COMMAND='ssh -o BatchMode=yes -o ConnectTimeout=10' git ls-remote git@github.com:ReliOptic/Campsite-for-duo.git HEAD >/dev/null 2>&1; then
    if duo-dev init; then
        if [ "${DUO_VERIFY_ON_BOOT:-0}" = '1' ]; then
            duo-dev test || printf '[boot] Duo tests failed; review logs before editing or merging.\n'
        fi
    else
        printf '[boot] Duo clone unavailable; Console/SSH remains available.\n'
    fi
else
    printf '[boot] Duo clone pending: register the public key as a read-only Deploy Key.
'
fi
exec "$@"
