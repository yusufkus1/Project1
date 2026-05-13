import { google } from "googleapis";
import { prisma } from "./prisma";

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env["GOOGLE_CLIENT_ID"],
    process.env["GOOGLE_CLIENT_SECRET"],
    process.env["GOOGLE_REDIRECT_URI"],
  );
}

async function getClientForUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { googleRefreshToken: true } });
  if (!user?.googleRefreshToken) return null;
  const client = getOAuthClient();
  client.setCredentials({ refresh_token: user.googleRefreshToken });
  return client;
}

export async function upsertCalendarEvent(
  userId: string,
  task: { id: string; title: string; description?: string | null; dueDate: Date; googleEventId?: string | null },
): Promise<string | null> {
  const client = await getClientForUser(userId);
  if (!client) return null;
  try {
    const calendar = google.calendar({ version: "v3", auth: client });
    const end = new Date(task.dueDate.getTime() + 60 * 60 * 1000); // +1h
    const event = {
      summary: task.title,
      description: task.description ?? undefined,
      start: { dateTime: task.dueDate.toISOString() },
      end: { dateTime: end.toISOString() },
    };
    if (task.googleEventId) {
      await calendar.events.update({ calendarId: "primary", eventId: task.googleEventId, requestBody: event });
      return task.googleEventId;
    } else {
      const res = await calendar.events.insert({ calendarId: "primary", requestBody: event });
      return res.data.id ?? null;
    }
  } catch (err) {
    console.error("Calendar upsert error:", err);
    return null;
  }
}

export async function deleteCalendarEvent(userId: string, googleEventId: string): Promise<void> {
  const client = await getClientForUser(userId);
  if (!client) return;
  try {
    const calendar = google.calendar({ version: "v3", auth: client });
    await calendar.events.delete({ calendarId: "primary", eventId: googleEventId });
  } catch (err) {
    console.error("Calendar delete error:", err);
  }
}
