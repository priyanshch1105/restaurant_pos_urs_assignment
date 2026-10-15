import { ErrorRequestHandler } from "express";
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);
  const status = typeof error?.statusCode === "number" ? error.statusCode : 500;
  res.status(status).json({ message: status === 500 ? "Something went wrong on the server." : error.message });
};
