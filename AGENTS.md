# AGENTS.md

Instructions for AI coding agents working in this repository. The file is tool-neutral:
Claude Code, Codex, Antigravity and other agents that read `AGENTS.md` all follow it. The
human-facing overview is in `README.md`.

## What this repository is

A collection of Agent Skills. Each top-level folder is one self-contained skill. There is no
build step, no package manager and no test suite. The deliverable is the Markdown and JavaScript
that another agent loads into its context at runtime, so every sentence costs that agent context
and every wrong claim misleads it.

```
<skill-name>/
├── SKILL.md       # entry point: YAML frontmatter + core workflow
├── references/    # detail loaded on demand
└── scripts/       # code the skill runs or injects
```

## Language

Everything written to this repository is in English: skill text, references, code, comments,
commit messages and docs.

## Writing or editing a skill

- **Frontmatter**: `name` and `description` are both required. `name` is lowercase with hyphens
  and matches the folder name.
- **The description is the trigger.** It is all the host agent sees before it decides to load
  the skill. Say what the skill does, when to use it (including phrasings a user would type), and
  what it is not for.
- **Keep `SKILL.md` readable in one pass.** Put the workflow and the rules that apply to every
  run in `SKILL.md`. Move topic-specific detail into `references/`, and link each reference from
  `SKILL.md` with a line saying when to read it. A reference that `SKILL.md` never mentions will
  never be loaded.
- **Paths are relative to the skill folder** (`references/theming.md`, not an absolute path).
- **Stay host-neutral.** Don't assume one agent product. Refer to MCP tools by the tool names
  their server exposes (`execute_code`, `export_shape`).
- **Pair each rule with its reason.** State the failure a rule prevents, so the reader can
  handle cases the rule doesn't cover. Existing references use the format
  `**symptom**: cause. Fix.` for API traps; keep it.

## penpot-design specifics

- `scripts/bootstrap.js`, `scripts/bulk.js` and `references/icons.js` are pasted verbatim as the
  body of a single `execute_code` call. They are async function bodies, not modules: no
  `import`, `export` or `require`, and the top-level `return` is intentional. Each must stay
  self-contained and safe to re-run.
- Bulk operations do one slice of work per call. Never add a loop that awaits many operations
  inside one call: that pattern hung the plugin for 18 minutes and dropped the MCP connection.
- The documented behaviour comes from the Penpot build of September 2026. Before you change a
  claim about the Penpot API, confirm it with a probe against a live Penpot through the MCP. Add
  new traps to `references/api-gotchas.md`. When you add a guardrail to `bootstrap.js`, also list
  it in the file's header comment.
- When you add a reference file, add it to the "Going further" list in `SKILL.md` and to the
  reference table in `README.md`.
- New icons use the Lucide 24×24 path format already in `references/icons.js`.

## Checking a change

Run these from the repository root before you finish:

```sh
# Every references/ and scripts/ path a SKILL.md mentions exists
for d in */; do grep -oE '(references|scripts)/[A-Za-z0-9._-]+' "${d}SKILL.md" | sort -u |
  while read -r p; do [ -e "$d$p" ] || echo "missing: $d$p"; done; done

# Injected JS parses as an async function body (parses only, does not run it)
node -e 'const fs=require("fs");const AF=Object.getPrototypeOf(async function(){}).constructor;
for(const f of process.argv.slice(1)){try{new AF(fs.readFileSync(f,"utf8"))}catch(e){console.log("FAIL",f,e.message)}}' \
  */scripts/*.js */references/*.js
```

No output means both checks passed. They don't prove the skill works. If the change affects
behaviour, also run the skill in a real session against the tool it drives.

## Commits

- Use Conventional Commits, with the skill folder as the scope for skill changes:
  `feat(penpot-design): …`, `docs(penpot-design): …`. For repository-wide changes, leave the
  scope out: `chore: …`.
- Keep one topic per commit.
- Don't commit OS files. `.DS_Store` is already in `.gitignore`.
