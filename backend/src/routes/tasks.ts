import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { upload } from "../middleware/upload";
import {
  getTasks, getTask, createTask, updateTask, deleteTask, reorderTasks,
  uploadAttachment, deleteAttachment,
} from "../controllers/task.controller";

const router = Router();

router.use(authenticate);
router.get("/", getTasks);
router.post("/", createTask);
router.post("/reorder", reorderTasks);
router.get("/:id", getTask);
router.patch("/:id", updateTask);
router.delete("/:id", deleteTask);
router.post("/:id/attachments", upload.single("file"), uploadAttachment);
router.delete("/:id/attachments/:attachmentId", deleteAttachment);

export default router;
