import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const packageJsonPath = join(ROOT, "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));

const REQUIRED_SCRIPTS = ["dev", "dev:backend", "dev:frontend"];

const missingScripts = REQUIRED_SCRIPTS.filter((scriptName) => {
  return typeof packageJson.scripts?.[scriptName] !== "string";
});

if (missingScripts.length > 0) {
  fail(`Missing scripts: ${missingScripts.join(", ")}`);
}

const scriptCommands = REQUIRED_SCRIPTS.map((scriptName) => {
  return packageJson.scripts[scriptName];
});

const missingReferencedFiles = scriptCommands
  .flatMap((command) => [...command.matchAll(/\bnode\s+([^\s]+)/g)])
  .map((match) => match[1])
  .filter((scriptPath) => !existsSync(join(ROOT, scriptPath)));

if (missingReferencedFiles.length > 0) {
  fail(`Scripts reference missing files: ${missingReferencedFiles.join(", ")}`);
}

if (!packageJson.devDependencies?.concurrently) {
  fail("Root devDependencies must include concurrently");
}

console.log("Root scripts are valid.");

function fail(message) {
  console.error(message);
  process.exit(1);
}
