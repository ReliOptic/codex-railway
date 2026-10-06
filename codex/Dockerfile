FROM node:22-bookworm-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392
ARG CODEX_VERSION=0.160.1
ARG CLAUDE_VERSION=2.1.291
RUN apt-get update && apt-get install -y --no-install-recommends git openssh-client ca-certificates curl tmux locales python3 python3-venv shellcheck procps && rm -rf /var/lib/apt/lists/*
RUN sed -i 's/^# *\(en_US.UTF-8\)/\1/' /etc/locale.gen && locale-gen
ENV LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 TERM=xterm-256color CODEX_HOME=/workspace/codex CLAUDE_CONFIG_DIR=/workspace/claude DISABLE_AUTOUPDATER=1
RUN npm install -g "@openai/codex@${CODEX_VERSION}" "@anthropic-ai/claude-code@${CLAUDE_VERSION}" && codex --version && claude --version && node --version && python3 --version
RUN arch="$(dpkg --print-architecture)"; case "$arch" in amd64) asset=x86_64; checksum=8a217c968aba172e0dbf3f34447218dc015bc4d5e59bf51db2f2cd12b7be4f55 ;; arm64) asset=aarch64; checksum=b38acadd89d1d396a0f5649aa52c539edbad07f4bc7348b27b4f4b7219dd4165 ;; *) exit 1 ;; esac; curl -fsSL "https://github.com/tsl0922/ttyd/releases/download/1.7.7/ttyd.${asset}" -o /usr/local/bin/ttyd && printf '%s  %s\n' "$checksum" /usr/local/bin/ttyd | sha256sum -c - && chmod 755 /usr/local/bin/ttyd && ttyd --version
RUN printf '#!/bin/sh\nexit 0\n' > /usr/local/bin/xdg-open && chmod 755 /usr/local/bin/xdg-open
COPY config.toml.default /opt/codex/config.toml.default
COPY tmux.conf /root/.tmux.conf
COPY duo-dev /usr/local/bin/duo-dev
COPY desk.html desk-server.cjs desk-entrypoint.sh desk-session.sh /opt/ai-desk/
RUN chmod 755 /usr/local/bin/duo-dev /opt/ai-desk/*.sh && sh -n /opt/ai-desk/desk-entrypoint.sh && sh -n /opt/ai-desk/desk-session.sh && shellcheck /opt/ai-desk/desk-entrypoint.sh /opt/ai-desk/desk-session.sh && node --check /opt/ai-desk/desk-server.cjs
WORKDIR /workspace/repos
EXPOSE 8080
ENTRYPOINT ["/opt/ai-desk/desk-entrypoint.sh"]
