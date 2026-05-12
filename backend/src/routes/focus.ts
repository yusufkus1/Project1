import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth";

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

router.post("/checkin", authenticate, (req: Request, res: Response) => {
  const uid = (req as any).user.id as string;
  activeSessions.set(uid, Date.now());
  res.json({ ok: true });
});

router.delete("/checkin", authenticate, (req: Request, res: Response) => {
  const uid = (req as any).user.id as string;
  activeSessions.delete(uid);
  res.json({ ok: true });
});

router.get("/count", authenticate, (_req: Request, res: Response) => {
  cleanStale();
  res.json({ count: activeSessions.size });
});

export default router;
