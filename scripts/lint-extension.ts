import { fileURLToPath } from "node:url";
import { lintExtension } from "../tooling/lint-extension.ts";

await lintExtension(fileURLToPath(new URL("../", import.meta.url)));
