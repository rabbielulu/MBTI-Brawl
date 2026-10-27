#!/bin/bash
cd -- "$(dirname -- "$0")" || exit 1

# Finder launches with a minimal PATH; also support the bundled Codex runtime.
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
HOST_NODE="$(command -v node 2>/dev/null)"
if [ -z "$HOST_NODE" ]; then
  HOST_NODE="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
fi
if [ ! -x "$HOST_NODE" ]; then
  echo "没有找到 Node.js，请安装 Node.js 22 后再双击启动。"
  read -r -p "按回车关闭…"
  exit 1
fi
"$HOST_NODE" --import tsx scripts/host.mjs
HOST_EXIT=$?
if [ "$HOST_EXIT" -ne 0 ]; then
  echo "启动失败，请查看上方提示。"
  read -r -p "按回车关闭…"
fi
exit "$HOST_EXIT"
