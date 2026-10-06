FROM node:22-bookworm-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392
ARG CODEX_VERSION=0.160.1
RUN apt-get update && apt-get install -y --no-install-recommends git openssh-client ca-certificates curl tmux locales python3 python3-venv shellcheck procps && rm -rf /var/lib/apt/lists/*
RUN sed -i 's/^# *\(en_US.UTF-8\)/\1/' /etc/locale.gen && locale-gen
ENV LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8 TERM=xterm-256color CODEX_HOME=/workspace/codex
RUN npm install -g "@openai/codex@${CODEX_VERSION}" && codex --version && node --version && python3 --version
RUN printf '#!/bin/sh\nexit 0\n' > /usr/local/bin/xdg-open && chmod 755 /usr/local/bin/xdg-open
COPY config.toml.default /opt/codex/config.toml.default
COPY tmux.conf /root/.tmux.conf
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY duo-dev /usr/local/bin/duo-dev
RUN chmod 755 /usr/local/bin/entrypoint.sh /usr/local/bin/duo-dev && bash -n /usr/local/bin/entrypoint.sh && bash -n /usr/local/bin/duo-dev && shellcheck /usr/local/bin/entrypoint.sh /usr/local/bin/duo-dev
WORKDIR /workspace
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["sleep", "infinity"]
