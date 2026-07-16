import { Request, Response } from "express";
import { getCommentsMessage } from "../services/comments.service";

export const getComments = (req: Request, res: Response) => {
  const data = getCommentsMessage();
  
  res.json(data);
}