# ai-skills

Agent Skills for AI coding agents. Each skill is a folder with a `SKILL.md` file and the
references and scripts it loads when needed. The format is the open Agent Skills format, so the
same folder works in Claude Code, OpenAI Codex, Google Antigravity and any other agent that reads
`SKILL.md`.

## Skills

| Skill | What it does | Needs |
|---|---|---|
| [penpot-design](penpot-design/SKILL.md) | Designs in Penpot: screens, mockups, dashboards, UI kits, design systems, components, colour and type styles, light/dark themes, design tokens, prototypes, design-to-code and design-system audits. Ships a tested helper library, a 70-icon set and a list of the Penpot API traps that break designs or hang the plugin. | A Penpot MCP server, with the Penpot MCP plugin open in the file you want to edit. |
| [brainstorm-gaps](brainstorm-gaps/SKILL.md) | Stress-tests an idea, project or plan to surface what you aren't seeing: unstated assumptions, failure modes, dismissed alternatives, hidden costs. Asks short rounds of ranked questions, each with a recommended answer and the cheapest way to check it, and stops early. Writes no files. | Nothing. Runs only when you invoke it by name. |

## Installation

Clone the repository, then symlink each skill into the skills folder of your agent. With a
symlink, a `git pull` updates the installed skill.

```sh
git clone https://github.com/fonchaves/ai-skills.git
cd ai-skills

# Claude Code
ln -s "$PWD/penpot-design" ~/.claude/skills/penpot-design

# Codex
mkdir -p ~/.agents/skills && ln -s "$PWD/penpot-design" ~/.agents/skills/penpot-design

# Antigravity
mkdir -p ~/.gemini/config/skills && ln -s "$PWD/penpot-design" ~/.gemini/config/skills/penpot-design
```

| Agent | User-wide folder | Per-project folder |
|---|---|---|
| Claude Code | `~/.claude/skills/` | `.claude/skills/` |
| Codex | `~/.agents/skills/` (older versions used `~/.codex/skills/`) | `.agents/skills/` |
| Antigravity | `~/.gemini/config/skills/` | `.agents/skills/` |

Start a new agent session after installing. Agents read the skill list when a session starts.

You don't need to name a skill when you ask for something. The agent reads each skill's
`description` and loads the skill when the request matches it. For example, with the Penpot MCP
connected, "design a login screen for a banking app" loads `penpot-design`.

## penpot-design

Setup:

1. Run a Penpot MCP server and register it with your agent.
2. In Penpot, open the file you want to work on and start the MCP plugin. The agent can only edit
   the file, and the page, that is open in that tab.

The skill loads `scripts/bootstrap.js` (the drawing helpers), `references/icons.js` and
`scripts/bulk.js` (batch operations) into the plugin as the work needs them. It reads the
reference files only when the task calls for them:

| Reference | Topic |
|---|---|
| [layout.md](penpot-design/references/layout.md) | Frame presets, platform chrome, vertical spacing budget |
| [design-system.md](penpot-design/references/design-system.md) | Library colours, typographies, components, documentation board |
| [theming.md](penpot-design/references/theming.md) | Light/dark variants and design tokens |
| [prototyping.md](penpot-design/references/prototyping.md) | Flows, interactions, overlays, transitions |
| [design-to-code.md](penpot-design/references/design-to-code.md) | Frames to HTML/CSS and React, token extraction |
| [design-system-audit.md](penpot-design/references/design-system-audit.md) | Palette drift, token migrations, WCAG AA, component consistency |
| [api-gotchas.md](penpot-design/references/api-gotchas.md) | Every known API trap, as symptom, cause and fix |

The behaviour documented here was observed on the Penpot build of September 2026. When the
connection drops, the plugin hangs or the MCP reports an error, check
[api-gotchas.md](penpot-design/references/api-gotchas.md) first.

## brainstorm-gaps

Invoke it explicitly with the idea in the same message: `/brainstorm-gaps <idea>` in Claude Code,
`$brainstorm-gaps <idea>` in Codex. It never loads on its own, so it stays out of ordinary
requests.

A session plays the idea back as "you said" and "I'm assuming", then asks 3–5 ranked gaps per
round and ends with three lists: what was decided, the open bets, and the cheapest checks to run
first.

## Repository layout

```
<skill-name>/
├── SKILL.md       # entry point: frontmatter (name, description) and the core workflow
├── references/    # detail the skill loads on demand
├── scripts/       # code the skill runs or injects
└── agents/        # optional host-specific config, e.g. openai.yaml for Codex
```

## Contributing

[AGENTS.md](AGENTS.md) has the conventions for adding or changing a skill: frontmatter rules,
file layout, how to check a change, and commit format. Coding agents working in this repository
read it automatically, and it applies to human contributors too.
