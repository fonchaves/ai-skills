---
name: release-notes
description: Pick the Conventional Commits type that decides a change's semver bump (feat, fix or a type that makes no release) and write the release note users read, as a per-change note file in each of the project's languages, for projects whose releases a tool such as release-please numbers from commit types. Use when finishing a change, committing it or opening a pull request in a project whose instructions ask for release notes or point to a releasing guide, and when the user asks to add a changelog entry or release note, or which type or bump a change deserves ("feat or fix?", "patch or minor?", "does this need a release note?"). Reads the project's releasing guide for paths, languages and tone. Not for a personal changelog in a notes vault, and not for hand-writing a CHANGELOG.md that a release tool generates.
---

# Release notes

A release tool numbers versions from commit types, so the type you pick is the version bump, and
the note you write is what users read about the release. Do both while the change is still in your
context: written later, from commit titles, the note costs a second read of the diff and comes out
vaguer.

## 1. Read the project's settings

Find the project's releasing guide: the agent instructions (`AGENTS.md`, `CLAUDE.md`) usually point
to it; otherwise look for `docs/releasing.md` or `RELEASING.md`. Read it whole. It names where notes
go, their schema, the languages, the tone, and who gathers them at release. Where it disagrees with
this skill, the project wins: it knows its users and its tooling.

No guide, but the user wants release notes? Offer to set one up from
[references/project-setup.md](references/project-setup.md) and stop until they agree. A note
format invented on the spot won't match whatever gathers the notes later.

## 2. Pick each commit's type

List the branch's commits (`git log <base>..HEAD --format='%h %s'`) and check each type against one
question: **would a user of the product notice if this change were reverted?**

| A user… | Type | Bump | Note |
|---|---|---|---|
| can do something new, or sees something new | `feat` | minor | yes |
| finds something that failed or misled now works | `fix` | patch | yes |
| notices it's faster | `perf` | patch | yes, as a fix |
| notices nothing | `build`, `ci`, `test`, `refactor`, `docs`, `chore` | none | no |

- The user is whoever uses the product, not the developer at work in the repository. A new eval, a
  deployment health check, a faster test suite or a new script is `build`, `ci` or `test`, never
  `feat`: as `feat` it would cut a release with nothing in it for users.
- A refactor that also fixes a visible bug is a `fix`. Judge by the effect, not by the diff.
- A breaking change (`feat!`, or a `BREAKING CHANGE:` footer) makes a major; below 1.0 many projects
  make it a minor. Use it only for a change that breaks what users or integrators rely on, and only
  when the guide says how.
- Each commit that reaches the main branch counts, not only the pull request's title. A wrong type
  in an unpushed commit can be reworded; in a pushed one, tell the user rather than rewriting
  shared history.

## 3. Write the note

One note per change a user notices, in the file and schema the guide gives. Several commits that
make one change share one note; one pull request can carry several notes.

- **One sentence about what the user can now do or no longer runs into**, in the user's words.
  Benefit first, mechanism only when the user needs it to use the change.
- **No internal vocabulary**: decision or ticket numbers, file, library or service names, and team
  jargon. A fix says what works now, not what the bug was.
- **Every language is written, not translated.** Before writing, read the project's own interface
  text for the same things (its locale files, or the screens the change touches) and use its words,
  its form of address and its tone. A literal translation picks synonyms the product never uses,
  and the note then reads as if it came from another app.
- **No promises** about what comes next, and no names of people or customers.

Check the note the way the project checks it (often a test that validates every pending note), and
show the user the notes with the types you chose.

## 4. At release

Follow the guide. When a script or CI gathers the notes into the release, nothing is left for you
to do. Never edit the release tool's own branch by hand when the tool rewrites it on each run (as
release-please does): the edit disappears at its next run. Change a pending note on the main branch
instead.
