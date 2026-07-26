export function readHtmlFile(htmlFile: Blob): Promise<string> {
  return htmlFile.text();
}
