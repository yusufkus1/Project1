import { Router } from "express";
import { auth } from "../middleware/auth";
import { getHabits, createHabit, updateHabit, deleteHabit, toggleLog } from "../controllers/habit.controller";

const router = Router();
router.use(auth);

router.get("/", getHabits);
router.post("/", createHabit);
router.put("/:id", updateHabit);
router.delete("/:id", deleteHabit);
router.post("/:id/toggle", toggleLog);

export default router;
