import express from "express";
import { corsHeaders } from "./middleware/http.middleware";
import { errorHandler } from "./middleware/error.middleware";
import authRoutes from "./routes/auth.routes";
import menuRoutes from "./routes/menu.routes";
import orderRoutes from "./routes/order.routes";
import reportRoutes from "./routes/report.routes";
import settingsRoutes from "./routes/settings.routes";
import auditRoutes from "./routes/audit.routes";
import { databaseStatus } from "./store";

export function createApp() {
     const app = express();
      app.use(express.json());
       app.use(corsHeaders);

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
