# Backend structure

`config/` owns runtime and database setup. `models/` owns MongoDB schemas. `repositories/` owns persistence and the in-memory preview fallback. `services/` contains business rules and use cases. `controllers/` translates HTTP requests into service calls. `routes/` defines endpoint composition, while `middleware/` handles async errors, CORS, authentication, authorization, and centralized errors, while `validators/` owns Zod request schemas. `server.ts` is only the application bootstrap that combines Next.js with Express.
