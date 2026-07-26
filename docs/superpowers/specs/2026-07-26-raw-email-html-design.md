# Raw email HTML design

## Goal

Send administrator-supplied HTML through SMTP without removing or rewriting
tags, attributes, URLs, classes, inline styles, or event attributes.

## Behavior

When the UI enables HTML rendering, the backend trims surrounding whitespace
from the submitted HTML and passes the remaining string unchanged to the mail
sender. The backend continues to derive a plain-text fallback from the HTML
when no explicit text body is supplied.

The authenticated administrator is responsible for the submitted markup.
No raw-HTML option is added to the public ingestion endpoint.

## Implementation

- Remove `sanitize-html` from the mail sending path.
- Remove the runtime package and its type package.
- Replace sanitization tests with exact raw-HTML preservation tests.
- Keep recipient, subject, and non-empty message validation unchanged.

## Verification

- Demonstrate the new preservation test failing before implementation.
- Run all backend tests after implementation.
- Build backend and frontend.
- Rebuild the production backend container.
- Send an HTML message containing `class`, `onerror`, `originalSrc`, and hidden
  positioning CSS through the authenticated application API.
- Confirm SMTP acceptance and the absence of backend errors.
