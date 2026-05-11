import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import authRoutes from "./routes/auth";
import userRoutes from "./routes/users";
import taskRoutes from "./routes/tasks";
import projectRoutes from "./routes/projects";
import tagRoutes from "./routes/tags";

const app = express();
const PORT = process.env["PORT"] ?? 3001;

app.use(cors({ origin: process.env["FRONTEND_URL"] ?? "http://localhost:5173", credentials: true }));
app.use(express.json());
const UPLOADS_DIR = process.env["UPLOADS_DIR"] ?? path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(UPLOADS_DIR));

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tags", tagRoutes);

app.get("/api/health", (_, res) => res.json({ status: "ok" }));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
