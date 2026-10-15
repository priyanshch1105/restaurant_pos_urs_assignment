const { resolve } = require("node:path");
const SwaggerParser = require("@apidevtools/swagger-parser");

const specPath = resolve(__dirname, "../docs/openapi.yaml");

SwaggerParser.validate(specPath)
  .then((api) => {
    console.log(`OpenAPI ${api.openapi} is valid: ${Object.keys(api.paths).length} paths.`);
  })
  .catch((error) => {
    console.error(`OpenAPI validation failed: ${error.message}`);
    process.exitCode = 1;
  });
