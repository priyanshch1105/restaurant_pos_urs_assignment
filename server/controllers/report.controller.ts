import { Request, Response } from "express";
import { getDailySalesReport } from "../services/report.service";
export async function dailySales(_req: Request, res: Response) { res.json(await getDailySalesReport()); }
