import { fileURLToPath } from "node:url";
import { generateIcons } from "../tooling/icons.ts";

generateIcons(fileURLToPath(new URL("../", import.meta.url)));
