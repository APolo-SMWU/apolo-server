import cookieParser from "cookie-parser";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./docs/swagger";
import { errorHandler } from "./middlewares/error-handler";
import express from "express";
import authRoutes from "./routes/auth.routes";
import portfoliosRoutes from "./routes/portfolios.routes";
import sharedRoutes from "./routes/shared.routes";
import usersRoutes from "./routes/users.routes";
import { getCorsOrigins } from "./config/cors";

const app = express();

app.use(
  cors({
    origin: getCorsOrigins(),
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRoutes);
app.use("/portfolios", portfoliosRoutes);
app.use("/share", sharedRoutes);
app.use("/users", usersRoutes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use(errorHandler);

export default app;
