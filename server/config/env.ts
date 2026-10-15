const taxRate = Number(process.env.TAX_RATE || 5);

if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) {
  throw new Error("TAX_RATE must be a number between 0 and 100.");
}

if (process.env.NODE_ENV === "production" && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be configured in production.");
}

export const env = {
  port: Number(process.env.PORT || 3000),
  taxRate,
  jwtSecret: process.env.JWT_SECRET || "local-development-only-secret",
  mongoUri: process.env.MONGODB_URI || ""
};
