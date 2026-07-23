# Commit Message Guidelines

Single source of truth for commit message style in this repo. Used by both
the `commit-style` Claude Code skill and VS Code's Copilot commit message
generation (`github.copilot.chat.commitMessageGeneration.instructions`).

## Format

```
<type>(<scope>): <description>
```

- `<scope>` is optional — include only when it adds clarity (e.g. a package,
  module, or area name).
- No period at the end of the subject line.

## Types

- `feat` — new functionality
- `fix` — bug fix
- `docs` — documentation only
- `test` — adding or updating tests
- `chore` — tooling, deps, config, maintenance
- `refactor` — code change that neither fixes a bug nor adds a feature

## Rules

- Imperative mood: "add", "fix", "bump" — not "added", "fixes", "bumped".
- Subject line target ~65 characters, hard cap ~72.
- Reference an issue/PR number in parentheses at the end when relevant:
  `(#123)`.
- Body is optional. Only add one when the *why* isn't obvious from the diff
  or subject line — wrap at ~72 chars, separated from the subject by a
  blank line. Don't restate the diff.
- Merge commits: `merge: PR #<num> — <short summary of the merged work>`.
- Revert commits: `Revert "<original subject line>"`.

## Examples

```
feat(rules): add C# language support
```

```
chore(deps-dev): bump flatted (#675)
```

```
fix: auto-detect ECC root from plugin cache when CLAUDE_PLUGIN_ROOT is unset (#547)
```

```
docs: add Antigravity setup and usage guide (#552)
```

```
merge: PR #529 — feat(skills): add documentation-lookup, bun-runtime, nextjs-turbopack; feat(agents): add rust-reviewer
```

```
Revert "Add Kiro IDE support (.kiro/) (#548)"
```

```
feat: add block-no-verify hook for Claude Code and Cursor (#649)
```
