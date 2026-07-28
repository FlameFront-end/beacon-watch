import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "vitest";

import { Checkbox } from "./Checkbox";

describe("Checkbox", () => {
  it("preserves native checkbox semantics and form attributes", () => {
    const markup = renderToStaticMarkup(
      <Checkbox
        label="Require public PoC"
        name="requirePublicPoc"
        checked
        disabled
        onChange={() => undefined}
      />,
    );

    assert.match(markup, /type="checkbox"/);
    assert.match(markup, /name="requirePublicPoc"/);
    assert.match(markup, /checked=""/);
    assert.match(markup, /disabled=""/);
    assert.match(markup, />Require public PoC</);
  });

  it("associates optional supporting text with the input", () => {
    const markup = renderToStaticMarkup(
      <Checkbox
        label="Render message as HTML"
        description="The message body will be sent as HTML."
        checked={false}
        onChange={() => undefined}
      />,
    );

    assert.match(markup, /aria-describedby="[^"]+"/);
    assert.match(markup, />The message body will be sent as HTML\.</);
  });

  it("does not apply the unchecked hover surface to a checked checkbox", () => {
    const stylesheet = readFileSync(
      new URL("./Checkbox.module.scss", import.meta.url),
      "utf8",
    );

    assert.match(stylesheet, /\.input:not\(:checked\):not\(:disabled\) \+ \.box/);
  });
});
