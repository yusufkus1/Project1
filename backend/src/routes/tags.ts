import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getTags, createTag, updateTag, deleteTag } from "../controllers/tag.controller";

const router = Router();

router.use(authenticate);
router.get("/", getTags);
router.post("/", createTag);
router.patch("/:id", updateTag);
router.delete("/:id", deleteTag);

export default router;
