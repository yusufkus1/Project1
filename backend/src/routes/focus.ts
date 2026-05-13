import { Router, Response } from "express";
import { authenticate, AuthRequest } from "../middleware/auth";

const router = Router();

// userId → lastHeartbeat ms
const activeSessions = new Map<string, number>();
const TIMEOUT_MS = 2 * 60 * 1000;

function cleanStale() {
  const now = Date.now();
  for (const [uid, ts] of activeSessions) {
    if (now - ts > TIMEOUT_MS) activeSessions.delete(uid);
  }
}

router.post("/checkin", authenticate, (req: AuthRequest, res: Response) => {
  activeSessions.set(req.userId!, Date.now());
  res.json({ ok: true });
});

router.delete("/checkin", authenticate, (req: AuthRequest, res: Response) => {
  activeSessions.delete(req.userId!);
  res.json({ ok: true });
});

router.get("/count", authenticate, (_req: AuthRequest, res: Response) => {
  cleanStale();
  res.json({ count: activeSessions.size });
});

export default router;
