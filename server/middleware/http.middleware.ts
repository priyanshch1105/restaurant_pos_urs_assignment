import { RequestHandler } from "express";
export const corsHeaders: RequestHandler = (req, res, next) => { res.setHeader("Access-Control-Allow-Origin", "*"); res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization"); if (req.method === "OPTIONS") return res.sendStatus(204); next(); };
