# Setting up a project for release notes

Read this only when a project has no releasing guide and the user agreed to set one up. Adapt every
path and name to the project's layout and conventions; ask the user for anything below that is a
product decision (the languages, when 1.0 comes).

The setup has four parts: a release tool that numbers versions from commit types, a place for notes
waiting for a release, a gatherer that moves them into the release, and a guide that says all of it.

## 1. The release tool

release-please keeps a release pull request open on the main branch and makes the release when it
is merged. A manifest setup (`release-please-config.json`, `.release-please-manifest.json`):

```json
{
  "bootstrap-sha": "<the main branch's commit when releases start>",
  "include-component-in-tag": false,
  "packages": {
    ".": {
      "release-type": "node",
      "bump-minor-pre-major": true,
      "changelog-sections": [
        { "type": "feat", "section": "Features" },
        { "type": "fix", "section": "Bug Fixes" },
        { "type": "perf", "section": "Performance" },
        { "type": "revert", "section": "Reverts" },
        { "type": "docs", "section": "Documentation", "hidden": true },
        { "type": "refactor", "section": "Refactoring", "hidden": true },
        { "type": "test", "section": "Tests", "hidden": true },
        { "type": "build", "section": "Build", "hidden": true },
        { "type": "ci", "section": "CI", "hidden": true },
        { "type": "chore", "section": "Chores", "hidden": true }
      ]
    }
  }
}
```

- **`bootstrap-sha`** starts the count at a recent commit, so the first release doesn't list the
  whole history. The manifest holds the current version (`{ ".": "0.1.0" }`).
- **`bump-minor-pre-major`** keeps a breaking change below 1.0 at a minor; 1.0.0 comes from a commit
  with the footer `Release-As: 1.0.0`. A hidden section makes no release.
- **The token.** A pull request opened with GitHub Actions' `GITHUB_TOKEN` runs no workflow, so the
  checks would never run on the release's. Give the action a fine-grained personal access token for
  that repository alone, with read and write on contents, pull requests and issues, as a secret.
- **The action** (`googleapis/release-please-action`) runs on each push to the main branch, after
  the checks. Pin it to a release's commit, as a tag can move. Its outputs say whether a release was
  made (`release_created`, `version`) and whether its pull request changed (`prs_created`); an image
  or package built for the release can take the version as a tag from them.

## 2. Notes waiting for a release

One file per change users notice, in a folder of its own (`changelog/unreleased/<slug>.json`, with a
`.gitkeep` so the folder survives when empty), one key per interface language:

```json
{ "type": "feat", "en": "…", "pt-BR": "…", "es": "…" }
```

Validate the schema in the project's test suite, over every pending note, so a pull request's checks
refuse a note that lacks a language before the release does.

## 3. The gatherer

A script that reads the version from the manifest, moves the pending notes into the released notes
(one file per language, releases newest first, the release replaced if it is already there, so a
second run changes nothing), and deletes the pending files. Take the release's day from the heading
release-please writes in `CHANGELOG.md`, so the two agree.

Run it in CI right after the release action, on every push to the main branch: find the open
release pull request (release-please labels it `autorelease: pending`; `gh pr list --label
"autorelease: pending" --json headRefName`), check out its branch with the same token, and when
notes wait there, run the gatherer and commit and push. With none waiting, skip the install. When
release-please rewrites its branch, which drops that commit, the next run gathers the notes again.

- Don't guess the branch's name: with a `package-name` in the config it carries the component
  (`release-please--branches--main--components--<name>`).
- Don't run only when the action reports `prs_created`: a push that changes nothing in the release,
  such as a `ci` commit, leaves the pull request untouched, and its notes would wait for the next
  feature or fix.

Keep the released notes where the product reads them only on its changelog page. In an app whose
pages send their whole locale file to the browser, notes added to that file weigh on every page.

## 4. The guide

Write `docs/releasing.md` and point to it from the agent instructions' commit rules, with a line
asking for the note before a pull request with a `feat`, `fix` or `perf` commit. The guide should
hold:

- the type table of the skill, with the project's own examples of work users don't notice;
- the note's path, schema and languages, and a sample note;
- the tone, with the product's own words for its main things in each language;
- how a release is made, how to change a pending note (on the main branch) and a released one;
- a settings table: pending notes, schema, languages, released notes, gatherer, release tool.

The guide must be enough without this skill: agents in CI, in the cloud or on another machine may
not have it installed.
