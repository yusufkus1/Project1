import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getProjects, createProject, updateProject, deleteProject } from "../controllers/project.controller";

const router = Router();

router.use(authenticate);
router.get("/", getProjects);
router.post("/", createProject);
router.patch("/:id", updateProject);
router.delete("/:id", deleteProject);

export default router;
