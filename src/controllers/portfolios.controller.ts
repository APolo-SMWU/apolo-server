import { Request, Response } from "express";
import { getPortfoliosMessage } from "../services/portfolios.service";

export const getPortfolios = (req: Request, res: Response) => {
  const data = getPortfoliosMessage();
  
  res.json(data);
}