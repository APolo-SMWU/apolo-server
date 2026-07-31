import { errorHandler } from "./middlewares/error-handler";
import express from "express";
import authRoutes from "./routes/auth.routes";
import portfoliosRoutes from "./routes/portfolios.routes";
import commentsRoutes from "./routes/comments.routes";
import archiveRoutes from "./routes/archive.routes";

const app = express();

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/portfolios", portfoliosRoutes);
app.use("/comments", commentsRoutes);
app.use("/archive", archiveRoutes);

app.use(errorHandler);

export default app;