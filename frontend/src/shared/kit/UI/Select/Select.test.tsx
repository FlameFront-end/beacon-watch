import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { Select } from "./Select";
import { findNextEnabledOptionIndex } from "./select-navigation";

const OPTIONS = [
  { value: "any", label: "Any" },
  { value: "critical", label: "Critical", disabled: true },
  { value: "high", label: "High" },
] as const;

describe("Select", () => {
  it("renders the selected label with combobox semantics", () => {
    const markup = renderToStaticMarkup(
      <Select
        value="high"
        options={OPTIONS}
        ariaLabel="Severity"
        onChange={() => undefined}
      />,
    );

    assert.match(markup, /role="combobox"/);
    assert.match(markup, /aria-label="Severity"/);
    assert.match(markup, /aria-expanded="false"/);
    assert.match(markup, />High</);
  });

  it("preserves the field name and value for form submission", () => {
    const markup = renderToStaticMarkup(
      <Select
        name="severity"
        value="high"
        options={OPTIONS}
        ariaLabel="Severity"
        onChange={() => undefined}
      />,
    );

    assert.match(markup, /type="hidden"/);
    assert.match(markup, /name="severity"/);
    assert.match(markup, /value="high"/);
  });
});

describe("findNextEnabledOptionIndex", () => {
  it("skips disabled options and wraps in both directions", () => {
    assert.equal(findNextEnabledOptionIndex(OPTIONS, 0, 1), 2);
    assert.equal(findNextEnabledOptionIndex(OPTIONS, 2, 1), 0);
    assert.equal(findNextEnabledOptionIndex(OPTIONS, 0, -1), 2);
  });
});
