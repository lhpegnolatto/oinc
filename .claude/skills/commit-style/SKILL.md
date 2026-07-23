---
name: commit-style
description: >
  Standardized commit message conventions for this repo (Conventional Commits,
  imperative mood, ~65 char subject). Use whenever drafting or editing a git
  commit message, subject line, or PR title in this repo — including within
  `git commit -m`/heredoc bodies.
---

Follow [.github/commit-instructions.md](../../../.github/commit-instructions.md)
for every commit message subject line you write in this repo — that file is
the single source of truth (also used by VS Code's Copilot commit message
generation) so keep it in sync rather than duplicating rules here.

Quick reference: `<type>(<scope>): <description>`, imperative mood, no
trailing period, ~65 char subject (hard cap ~72), types are
feat/fix/docs/test/chore/refactor.

This governs the subject line only — it doesn't change the repo's git
workflow (heredoc format, `Co-Authored-By` trailer, confirmation before
push/force-push, etc.), which still applies as usual.
