---
name: bot-change-workflow
description: The owner's workflow for an Orca bot that takes a code change from a request to a merged, deployed change on the owner's devbox server - restating the request, recording it as a GitHub issue, working in an Orca worktree, delegating to workers by quota, running Codex's review rounds, asking the Pilho Reviewer bot to clear the pull request, asking the owner, merging and deploying, and cleaning up. Use when you are one of the owner's Orca bots (Titico or a project bot) and a request for a code change reaches you from your chat, a GitHub comment mentioning @orca-bots, or an issue labeled bot. Project specifics - checks, deploy command, how to see what an environment runs, what is critical - come from the repository's AGENTS.md. Not for Pilho Reviewer's own gate (it only reads and answers), and not for interactive sessions on the owner's Mac.
---

# Bot change workflow

You take one change from the owner's words to a deployed result while the owner follows from their
chat, usually on a phone. Issues and pull requests are the record; the owner opens GitHub only for
what is critical. Every step below exists because skipping it once cost a stalled pull request, a
merge the owner had not seen, or quota that was needed elsewhere.

Talk to the owner in Brazilian Portuguese. Everything that lands in a repository (issues, commits,
pull requests, comments addressed to reviewers) is in English, with no tool or model attribution
lines.

## 1. Read the project first

Before planning anything, read the repository's `AGENTS.md` (or `CLAUDE.md`) whole, and the
project's ai-memory: rules, decisions, gotchas and recent pages. AGENTS.md names the checks, the
commit and release-note rules, the deploy command, how to see which build an environment runs, the
merge method, and what counts as critical. Where it disagrees with this skill, the project wins.
When a request conflicts with a recorded decision, stop and ask the owner.

## 2. One change at a time per project

Before starting, look for an open issue labeled `bot:working` in the repository. If one exists, tell
the owner what is in flight and, with their agreement, queue the new request as an issue labeled
`bot`; the project's scheduled check hands it to you when the current change is done. Two changes in
one project at once collide in the same files and the same deploy.

## 3. From request to issue

A question or an investigation that changes no code needs no issue: answer it in the chat. An issue
is for a code change, and it comes before any work on it, worker included. Its `bot:working` label
is what tells the scheduled check and the other bots that the project is busy, and between the start
of the work and the pull request nothing else says so; it also keeps the request on record if the
pull request is closed, replaced or never opened.

From a chat request, restate it in a few lines and ask only what you can't settle from the
repository, ai-memory or the conversation. Once the owner agrees, open the issue, label it
`bot:working`, and post its link in the chat. Keep its body to two to five lines: the request and the
decisions already taken, no plan (the pull request says how). When an investigation turns into a
fix, the issue starts there and names what the investigation found. An issue that arrived labeled
`bot`: swap the label for `bot:working`.

Your own label changes wake you. Orca's GitHub app wakes the project's bot in a new conversation
("Take over issue labeled ...") whenever an issue's label changes, even when you or your worker
changed it as the owner, and that run's final message is posted on the issue. When such a wake names
an issue you or your worker already hold (you opened it, a worker runs on it, or the pull request
that closes it is yours), it is the echo of your own step: start nothing, and end the run with one
line saying where the work stands (the worker, or the pull request's link), without mentioning the
owner, since a mention notifies them for nothing.

If you run on a lighter model (a scheduled run on Sonnet, say) and part of the issue needs deep
reasoning (hard debugging, security, migrations, architecture), delegate that part to a Claude
worker with `--model opus --effort high`. If the whole issue is like that, or needs the owner's
decisions, don't start it there: tell the owner in the chat why, label it `bot:blocked`, and go on in
the chat once they answer.

## 4. Do the work

Work in a fresh Orca worktree from `origin/main`: `orca worktree create --name <issue>-<short-slug>
--branch <bot>/<issue>-<short-slug> --base-branch origin/main`, where `<bot>` is your own short name
in lowercase (`titico`, `cvonico`, `mindico`). `--name` is required and names the workspace;
`--branch` names the Git branch, which must never carry the owner's login or the tool's default
prefix, since those hide that the work is a bot's. Run it with `--json` and keep the worktree it
returns: Orca adds a numeric suffix to the branch when that name is already taken (a stale or
retried workspace), so the name you asked for can point at another worktree. For larger changes
start a worker in that same worktree, selected by what `worktree create` returned (`orca agent
launch --worktree id:<returned id> --agent ... --effort ...`), chosen as the owner's global rules say: Antigravity by default, Claude when the task needs it,
never Codex, whose quota is kept for review. Review the worker's result before anything is pushed.
A report a worker writes to a file stays in its agent's own folders on the server, outside the
repository, and is lost with the session: carry what later steps need into the issue, a follow-up
issue or the pull request.

Problems you find on the way that the change doesn't need (a bug elsewhere, a finding moved out of
the pull request) become follow-up issues with no label. List them to the owner with your report;
they label `bot` the ones to queue.

Run the checks AGENTS.md asks for the change, follow its commit and release-note rules, and open a
pull request that says `Closes #<issue>`. Swap the label for `bot:review`.

## 5. Codex's review rounds

Codex reviews a pull request on its own only when it opens. After each round of fixes, push, and
comment `@codex review` to ask for the next round.

What gets fixed in the pull request, unless AGENTS.md sets other limits:

- P1 and security findings: always.
- P2 findings within the pull request's scope: during the first three rounds. From the fourth, each
  new P2 goes to a follow-up issue (or the backlog file AGENTS.md names) and the pull request moves
  on to Pilho. Every round finds rarer cases, and each costs a review and a worker's run.
- A finding about a pattern the whole app shares (every GET handler, every form): to a follow-up
  issue at once. Fixing it one instance at a time only shows Codex the next instance, round after
  round.

Answer every comment: what was fixed in which commit, why it doesn't apply, or which follow-up issue
now carries it. Then resolve the thread, whatever the answer. Codex's summary and Pilho's gate count
an open thread as an unresolved finding even once it is answered, and a gate that stays closed
pushes the deferred work back into the pull request. Pilho reads the answers and can still say "not
yet".

Don't poll. Schedule a wake on the pull request's CI result and next review with `orca automations
create --once`, with a deadline of about 30 minutes. A review with findings wakes you; a clean one
arrives as a plain comment from Codex ("Didn't find any major issues") that does not. So when the
deadline wakes you, first read the review state in Codex's summary comment for the head commit and
go on if it is done and clean. Only if that commit has no review, ask once more with `@codex review`;
if that also goes unanswered, tell the owner in the chat instead of waiting.

## 6. Pilho Reviewer's gate

When the checks pass (or the change touches only files the workflows ignore, such as docs and
markdown) and Codex has no unresolved finding, ask Pilho Reviewer to clear the pull request:
`orca orchestration send --to bot:"Pilho Reviewer" --type question`, naming the repository and the
pull request. Its verdict decides how you ask the owner:

- **go**: in the chat, in three lines at most: what changed and what was checked.
- **attention**: in the chat as well, with Pilho's reason and the few diff lines that carry the
  risk, quoted, so the owner can decide from the phone.
- **critical**: ask the owner to review the pull request on GitHub, and wait for their word in the
  chat or on the pull request.
- **not yet**: fix what Pilho named and ask again; nothing goes to the owner.

A repository whose AGENTS.md says every pull request goes to the owner on GitHub skips Pilho: say
it is ready for their review.

## 7. Asking, merging and deploying

Every question about merging also says what the deploy takes along: the merges already on `main`
that the environment doesn't run yet (AGENTS.md says how to read what it runs). End it with "Posso
fazer o merge e o deploy?", naming the environment.

On the owner's explicit yes for that pull request:

1. Comment on the pull request with the decision: that the owner approved it in your chat, Pilho's
   verdict and reasons, and anything decided on the way. Decisions taken in a chat are otherwise
   lost to the record.
2. Merge with the method the repository allows (`gh pr merge <n> --rebase`, `--squash` or `--merge`).
3. If the change builds something to deploy, wait for the workflow's run for the merged commit to
   succeed, then deploy with the command AGENTS.md names and confirm the environment runs the new
   build. If that run failed, don't deploy: a deploy script that picks the last successful build
   would ship an older one, and the environment would still look healthy. A change the workflows
   skip (docs only) builds nothing: say so and don't deploy.
4. If the workflow or the deploy fails, say what failed and offer a revert pull request. Never retry
   a deploy more than once on your own.

A yes covers only the pull request it answers.

## 8. Clean up

After a successful deploy (or the merge, when nothing deploys), report it in one line, with the
follow-up issues you opened, if any, and ask which to queue. Remove your
`bot:*` label from the issue the merge closed, and remove the change's worktree (`orca worktree
rm`); the branch is already gone from GitHub.

## Never

- Merge without the owner's explicit yes in your chat for that very pull request, merge a critical
  one they haven't reviewed on GitHub, or merge with failing checks, unresolved Codex findings or
  Pilho's "not yet".
- Push to `main`, force-push a branch you did not create, or delete branches or worktrees that are
  not yours.
- Deploy anything AGENTS.md doesn't name for bots, or touch Coolify's settings, the system Docker,
  real secrets or `.env` values, or repository settings and secrets.
- Work on more than one change at once in a project.
- Spend runs polling: wake on events and deadlines, and keep each run short, since the owner's
  quota is shared with their own sessions.
