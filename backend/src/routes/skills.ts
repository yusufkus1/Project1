import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getSkills, createSkill, updateSkill, deleteSkill, toggleSession } from "../controllers/skill.controller";

const router = Router();
router.use(authenticate);

router.get("/", getSkills);
router.post("/", createSkill);
router.put("/:id", updateSkill);
router.delete("/:id", deleteSkill);
router.post("/:id/toggle", toggleSession);

export default router;
