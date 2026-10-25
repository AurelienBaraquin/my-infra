#!/usr/bin/env bash
# Claude Code PreToolUse hook (matcher: Bash). Refuses `git commit` until the repository's git
# hooks are active, so a fresh clone cannot silently skip commit-message and docs checks.
# Exit code 2 blocks the tool call and shows the message to the agent.
input="$(cat)"

case "$input" in
  *"git commit"*) ;;
  *) exit 0 ;;
esac

if [ "$(git config --get core.hooksPath 2>/dev/null)" != ".githooks" ]; then
  echo "Git hooks are not active in this clone. Run: git config core.hooksPath .githooks (see CLAUDE.md), then retry the commit." >&2
  exit 2
fi
