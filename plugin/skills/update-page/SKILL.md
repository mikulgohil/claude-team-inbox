---
name: update-page
description: Bring the team's inbox page up to the version that ships with this plugin. Republishes the page to the same link; asks, members, groups and settings stay. For the inbox owner or an editor, after updating the plugin.
argument-hint: "[--force]"
disable-model-invocation: true
---

# Update the inbox page

Read `../../reference/protocol.md` (relative to this skill's base directory) before starting; its Ground rules apply, and so does its section "Update the inbox page".

The page and its data are separate: the page is the artifact's HTML, the asks live in its database.
Republishing the page to the same link changes the screens everyone sees and nothing they wrote.

1. `<run>` = a fresh working folder (protocol: Working folder).
2. `ArtifactData` `get` `config` / `app` with `out_dir: <run>`. Note its `version` and its `pageVersion` (missing on inboxes set up before 1.3.0).
3. `node <CLI> page-version --current <pageVersion>` (leave out `--current` when there is none). It prints `{template, current, update, page, capabilities}`:
   - `none`: say the page is already on `<template>` and stop, unless `$ARGUMENTS` has `--force` (republish anyway, for a page someone changed by hand).
   - `plugin-older`: the inbox is newer than this plugin. Tell the user to run `claude plugin update team-inbox@team-inbox`, restart Claude Code, and try again. Stop. Never publish an older page over a newer one.
   - `needed`: carry on.
4. `Artifact` `read` the inbox link. The result header says whether the user can edit it ("writer").
   If they cannot, stop and say: only the inbox owner or an editor can update the page; ask them to run `/team-inbox:update-page`.
   This read is also what lets the publish in step 6 replace the page in place.
5. Copy the template to `<your session scratchpad>/team-inbox/team-inbox.html` with Bash `cp <page> ...` (the Artifact tool publishes files from the working directory or the scratchpad only).
   Tell the user what will happen in one line, for example: `Updating the inbox page from 1.2.0 to 1.3.0. Asks and settings stay.` Then publish without waiting: the user ran this command to do exactly that.
6. Publish with the Artifact tool:
   - `url`: the inbox link (never leave it out: without it the publish creates a second, empty inbox)
   - `file_path`: the copied file
   - `capabilities`: the JSON object in the `capabilities` file the CLI printed, exactly
   - no `icon` and no `contract`: the page keeps its icon and its runtime version
   If the publish is refused as a conflict, someone changed the page since step 4: read it again (step 4) and publish once more. Do not use `force`.
7. Record the version: `ArtifactData` `update` `config` / `app` with `data: {pageVersion: <template>, pageUpdatedAt: <now>, updatedAt: <now>}` and `if_version` = the version from step 2. Get `<now>` from `node <CLI> ids`.
   If the version moved, `get` `config` / `app` again and retry the update once with the new version.
8. Finish with: `The inbox page is now <template>. Teammates get it the next time they open or reload the page.`
   Mention anything from the release notes in the plugin's README that owners need to do, if there is any; otherwise nothing.
