# HTML Mail Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a browser-side `.html`/`.htm` import control that places unchanged source into the mail composer as HTML content rather than an attachment.

**Architecture:** A focused `readHtmlFile` utility owns browser file reading and exposes a Promise-based interface. `SendMailPanel` owns picker state and updates the existing message and HTML-mode state after a successful read; SMTP API behavior remains unchanged.

**Tech Stack:** React 19, TypeScript 5.8, Vite 8, Vitest 4, SCSS modules

---

## File structure

- Create `frontend/src/features/mails/lib/read-html-file.ts`: read a browser `File` as unchanged text.
- Create `frontend/src/features/mails/lib/read-html-file.test.ts`: verify successful and failed reads.
- Modify `frontend/src/features/mails/pages/MailsDashboard/MailsDashboard.page.tsx`: add the file picker and import state transitions.
- Modify `frontend/src/features/mails/pages/MailsDashboard/MailsDashboard.module.scss`: style the import row and hidden picker.
- Modify `frontend/package.json` and lockfile: add Vitest and a non-watch test script.

### Task 1: File-reading behavior

- [ ] Add Vitest `4.1.6` as a frontend development dependency and add `"test": "vitest run"` to `frontend/package.json`.
- [ ] Write `read-html-file.test.ts` with one test expecting exact HTML source and one test expecting a read failure to reject.
- [ ] Run `npm --prefix frontend test` and confirm RED because `read-html-file.ts` does not exist.
- [ ] Implement `readHtmlFile(file: Blob): Promise<string>` using `FileReader.readAsText`.
- [ ] Run `npm --prefix frontend test` and confirm both tests pass.

### Task 2: Composer integration

- [ ] Add a hidden file input accepting `.html,.htm,text/html`.
- [ ] Add an **Import HTML** button that opens the picker.
- [ ] On selection, call `readHtmlFile`, replace the Message value, enable HTML mode, clear old errors, and reset the input so the same file can be selected again.
- [ ] On read failure, preserve the existing message and mode and show `Failed to read HTML file`.
- [ ] Add compact SCSS module styles for the import control and selected filename.

### Task 3: Verification and deployment

- [ ] Run `npm --prefix frontend test`.
- [ ] Run `npm run build`.
- [ ] Run `git diff --check` and inspect the scoped diff.
- [ ] Rebuild and recreate the production frontend container.
- [ ] Verify the production asset contains the import control and confirm the frontend container is healthy.

No commit is included because repository instructions require an explicit commit request.
