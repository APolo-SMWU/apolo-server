import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./docs/swagger";
import { errorHandler } from "./middlewares/error-handler";
import express from "express";
import authRoutes from "./routes/auth.routes";
import portfoliosRoutes from "./routes/portfolios.routes";
import commentsRoutes from "./routes/comments.routes";
import archiveRoutes from "./routes/archive.routes";
import sharedRoutes from "./routes/shared.routes";
import usersRoutes from "./routes/users.routes";

const app = express();

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/portfolios", portfoliosRoutes);
app.use("/comments", commentsRoutes);
app.use("/archive", archiveRoutes);
app.use("/shared", sharedRoutes);
app.use("/users", usersRoutes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(errorHandler);

export default app;