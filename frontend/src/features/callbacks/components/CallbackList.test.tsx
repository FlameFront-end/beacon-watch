import assert from "node:assert/strict";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "vitest";
import { Router } from "wouter";

import { CallbackList } from "./CallbackList";

describe("CallbackList", () => {
  it("renders sortable table headers with the active sort direction", () => {
    const markup = renderToStaticMarkup(
      <Router hook={useStaticLocation}>
        <CallbackList
          events={[{
            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
            timestamp: "2026-07-30T12:00:00.000Z",
            sourceIp: "203.0.113.10",
            userAgent: "curl",
            method: "POST",
            url: "https://rtweriu.com/api/callback",
            headers: {},
            queryParams: {},
            body: null,
            status: "processed",
            processedAt: "2026-07-30T12:00:00.000Z",
            targetId: null,
            payload: null,
          }]}
          isLoading={false}
          sortBy="timestamp"
          sortDirection="DESC"
          onSort={() => undefined}
          onDelete={() => undefined}
        />
      </Router>,
    );

    assert.match(markup, /aria-sort="descending"/);
    assert.match(markup, /Timestamp/);
    assert.match(markup, /IP/);
    assert.match(markup, /Status/);
  });
});

function useStaticLocation(): [string, (path: string) => void] {
  return ["/callbacks", () => undefined];
}
