import { Request, Response } from "express";
import { getAuthMessage } from "../services/auth.service";

export const getAuth = (req: Request, res: Response) => {
  const data = getAuthMessage();
  
  res.json(data);
}