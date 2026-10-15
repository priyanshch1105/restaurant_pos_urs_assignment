const { copyFileSync, mkdirSync } = require("node:fs");
const { resolve } = require("node:path");

const source = resolve(__dirname, "../docs/openapi.yaml");
const destinationDirectory = resolve(__dirname, "../dist/docs");

mkdirSync(destinationDirectory, { recursive: true });
copyFileSync(source, resolve(destinationDirectory, "openapi.yaml"));
console.log("Copied docs/openapi.yaml to dist/docs/openapi.yaml");
