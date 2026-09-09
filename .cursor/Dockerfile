# Base Cursor Cloud Agents — zm-tech (Node 22 + pnpm + Supabase CLI + psql).
# No COPY del repo: Cursor monta el workspace en el commit del agente.
FROM node:22-bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    postgresql-client \
    bash \
    jq \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

ARG SUPABASE_CLI_VERSION=2.117.0
RUN curl -fsSL \
    "https://github.com/supabase/cli/releases/download/v${SUPABASE_CLI_VERSION}/supabase_linux_amd64.tar.gz" \
  | tar -xz -C /usr/local/bin supabase \
  && chmod +x /usr/local/bin/supabase \
  && supabase --version

WORKDIR /workspace
