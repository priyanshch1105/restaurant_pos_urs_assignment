import express from "express";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";
import swaggerUi from "swagger-ui-express";
import { corsHeaders } from "./middleware/http.middleware";
import { errorHandler } from "./middleware/error.middleware";
import authRoutes from "./routes/auth.routes";
import menuRoutes from "./routes/menu.routes";
import orderRoutes from "./routes/order.routes";
import reportRoutes from "./routes/report.routes";
import settingsRoutes from "./routes/settings.routes";
import auditRoutes from "./routes/audit.routes";
import { databaseStatus } from "./store";

function loadOpenApiSpec() {
    const specPath = resolve(__dirname, "../docs/openapi.yaml");
    if (!existsSync(specPath)) {
        throw new Error(`OpenAPI specification not found at ${specPath}. Ensure docs/openapi.yaml is included in the deployment.`);
    }

    const source = readFileSync(specPath, "utf8");
    return { source, document: YAML.parse(source) };
}

const openApiSpec = loadOpenApiSpec();

export function createApp() {
     const app = express();
      app.use(express.json());
       app.use(corsHeaders);

        app.get("/api-docs/openapi.yaml", (_req, res) => {
            res.type("application/yaml").send(openApiSpec.source);
        });
        app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(undefined, {
            customSiteTitle: "Restaurant POS API documentation",
            swaggerOptions: {
                url: "/api-docs/openapi.yaml",
                tryItOutEnabled: true
            }
        }));

        app.get("/api/health", (_req, res) => {
            const database = databaseStatus();
            res.status(database.configured && !database.connected ? 503 : 200).json({
                ok: database.connected || !database.configured,
                service: "restaurant-pos",
                database
            });
        });
             app.use("/api/auth", authRoutes); 
             app.use("/api/menu", menuRoutes);
              app.use("/api/orders", orderRoutes);
               app.use("/api/reports", reportRoutes);
                app.use("/api/settings", settingsRoutes);
                app.use("/api/audit-logs", auditRoutes);
                app.use(errorHandler); return app; 
            }
