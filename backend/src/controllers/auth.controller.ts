import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../lib/prisma";

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, process.env["JWT_SECRET"]!, {
    expiresIn: process.env["JWT_EXPIRES_IN"] ?? "15m",
  } as jwt.SignOptions);
  const refreshToken = jwt.sign({ userId }, process.env["JWT_REFRESH_SECRET"]!, {
    expiresIn: process.env["JWT_REFRESH_EXPIRES_IN"] ?? "7d",
  } as jwt.SignOptions);
  return { accessToken, refreshToken };
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { email, password, name } = req.body as { email: string; password: string; name: string };
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ error: "Bu email zaten kullanımda" });
      return;
    }
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, password: hashed, name },
      select: { id: true, email: true, name: true, theme: true, createdAt: true },
    });
    // Create a default project
    await prisma.project.create({
      data: { name: "Genel", color: "#6366f1", icon: "inbox", userId: user.id },
    });
    const tokens = generateTokens(user.id);
    res.status(201).json({ user, ...tokens });
  } catch (err) {
    res.status(500).json({ error: "Sunucu hatası" });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string };
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      res.status(401).json({ error: "Geçersiz email veya şifre" });
      return;
    }
    const tokens = generateTokens(user.id);
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser, ...tokens });
  } catch {
    res.status(500).json({ error: "Sunucu hatası" });
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken: string };
    if (!refreshToken) {
      res.status(401).json({ error: "Refresh token gerekli" });
      return;
    }
    const decoded = jwt.verify(refreshToken, process.env["JWT_REFRESH_SECRET"]!) as { userId: string };
    const tokens = generateTokens(decoded.userId);
    res.json(tokens);
  } catch {
    res.status(401).json({ error: "Geçersiz refresh token" });
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  try {
    const { email } = req.body as { email: string };
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.json({ message: "Eğer bu email kayıtlıysa, sıfırlama linki gönderildi" });
      return;
    }
    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 3600000); // 1 hour
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    });
    // In production, send email here
    res.json({ message: "Şifre sıfırlama linki gönderildi", resetToken: token });
  } catch {
    res.status(500).json({ error: "Sunucu hatası" });
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  try {
    const { token, password } = req.body as { token: string; password: string };
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
      },
    });
    if (!user) {
      res.status(400).json({ error: "Geçersiz veya süresi dolmuş token" });
      return;
    }
    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetTokenExpiry: null },
    });
    res.json({ message: "Şifre başarıyla güncellendi" });
  } catch {
    res.status(500).json({ error: "Sunucu hatası" });
  }
}
