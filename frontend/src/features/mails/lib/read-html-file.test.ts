import { describe, expect, it } from "vitest";

import { readHtmlFile } from "./read-html-file";

describe("readHtmlFile", () => {
  it("returns the complete HTML source unchanged", async () => {
    const source =
      "<html>\r\n<body><img src=\"x\" onerror=\"window.test=true\"></body>\r\n</html>";
    const htmlFile = new Blob([source], { type: "text/html" });

    await expect(readHtmlFile(htmlFile)).resolves.toBe(source);
  });

  it("propagates a browser file read failure", async () => {
    const readFailure = new Error("read failed");
    const unreadableFile = {
      text: () => Promise.reject(readFailure),
    } as Blob;

    await expect(readHtmlFile(unreadableFile)).rejects.toBe(readFailure);
  });
});
