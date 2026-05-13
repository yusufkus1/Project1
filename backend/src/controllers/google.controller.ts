import { Request, Response } from "express";
import { google } from "googleapis";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/calendar.events",
];

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env["GOOGLE_CLIENT_ID"],
    process.env["GOOGLE_CLIENT_SECRET"],
    process.env["GOOGLE_REDIRECT_URI"],
  );
}

function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, process.env["JWT_SECRET"]!, {
    expiresIn: process.env["JWT_EXPIRES_IN"] ?? "15m",
  } as jwt.SignOptions);
  const refreshToken = jwt.sign({ userId }, process.env["JWT_REFRESH_SECRET"]!, {
    expiresIn: process.env["JWT_REFRESH_EXPIRES_IN"] ?? "7d",
  } as jwt.SignOptions);
  return { accessToken, refreshToken };
}

export function googleAuthRedirect(_req: Request, res: Response): void {
  const client = getOAuthClient();
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
  res.redirect(url);
}

export async function googleAuthCallback(req: Request, res: Response): Promise<void> {
  const frontendUrl = process.env["FRONTEND_URL"] ?? "http://localhost:5173";
  try {
    const code = req.query["code"] as string;
    if (!code) { res.redirect(`${frontendUrl}/login?error=no_code`); return; }

    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const { data } = await oauth2.userinfo.get();

    if (!data.email || !data.id) { res.redirect(`${frontendUrl}/login?error=no_profile`); return; }

    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: data.id }, { email: data.email }] },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: data.id,
          googleRefreshToken: tokens.refresh_token ?? user.googleRefreshToken,
          avatar: data.picture ?? user.avatar,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: data.email,
          name: data.name ?? data.email.split("@")[0]!,
          googleId: data.id,
          googleRefreshToken: tokens.refresh_token ?? undefined,
          avatar: data.picture ?? undefined,
        },
      });
      await prisma.project.create({
        data: { name: "General", color: "#6366f1", icon: "inbox", userId: user.id },
      });
    }

    const { accessToken, refreshToken } = generateTokens(user.id);
    const { password: _, googleRefreshToken: __, ...safeUser } = user;
    const encoded = encodeURIComponent(JSON.stringify({ user: safeUser, accessToken, refreshToken }));
    res.redirect(`${frontendUrl}/auth/callback?data=${encoded}`);
  } catch (err) {
    console.error("Google OAuth error:", err);
    res.redirect(`${frontendUrl}/login?error=oauth_failed`);
  }
}
