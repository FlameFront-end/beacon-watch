# HTML Mail Import

## Goal

Allow an administrator to load an `.html` or `.htm` file into the mail composer and send its source as the HTML body of the message. The imported file is message content, not an attachment.

## User flow

1. The administrator selects **Import HTML** in the **Send email** panel.
2. The browser opens a file picker limited to `.html` and `.htm` files.
3. After selection, the browser reads the file as text.
4. The imported source replaces the current **Message** value.
5. **Render message as HTML** becomes enabled automatically.
6. The administrator can review or edit the imported source before sending.
7. The existing send action submits the source in the `html` request field.

## Scope

- Read the selected file only in the browser.
- Do not upload or persist the source before the administrator sends the message.
- Do not create a mail attachment.
- Preserve the imported source without sanitizing or transforming it.
- Accept `.html` and `.htm` filenames.
- Show an inline error when the file cannot be read.
- Permit selecting the same file again by resetting the file input after each attempt.

## Implementation

Keep the file input and import behavior inside `SendMailPanel`. Put the browser file-reading operation in a small standalone function so its success and failure behavior can be tested without rendering the full dashboard.

The visible import control uses the existing button styling. A visually hidden native file input provides the file picker and remains keyboard-accessible through the button trigger.

## Error handling

If reading fails, preserve the current message and HTML toggle state and display `Failed to read HTML file`. Clear a previous send or import error when a new import succeeds.

## Verification

- A test proves that the selected file source is returned unchanged.
- A test proves that a browser file-read failure is propagated.
- The frontend TypeScript and production build complete successfully.
- Manual browser verification confirms that import replaces Message, enables HTML mode, and does not add an attachment.
