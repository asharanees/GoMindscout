import crypto from "crypto";

const DAILY_API_KEY = process.env.DAILY_API_KEY;

export async function createMeetingRoom(
  bookingId: number,
  scheduledAt?: Date | null,
  durationMinutes?: number | null,
): Promise<string> {
  const roomName = `gomindscout-${bookingId}-${crypto.randomBytes(4).toString("hex")}`;

  // Room expiry: scheduled end time, or 2h from now as fallback
  const sessionDuration = (durationMinutes ?? 60) * 60; // seconds
  const expBase = scheduledAt ? scheduledAt.getTime() / 1000 : Math.floor(Date.now() / 1000);
  const roomExp = Math.floor(expBase) + sessionDuration + 15 * 60; // add 15min buffer after session

  if (DAILY_API_KEY) {
    try {
      const resp = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DAILY_API_KEY}`,
        },
        body: JSON.stringify({
          name: roomName,
          privacy: "private",
          properties: {
            nbf: scheduledAt ? Math.floor(scheduledAt.getTime() / 1000) - 10 * 60 : undefined, // joinable 10min before
            exp: roomExp,
            enable_chat: true,
            enable_screenshare: true,
            start_video_off: false,
            start_audio_off: false,
            enable_knocking: false,
            enable_prejoin_ui: false,
            enable_network_ui: false,
            eject_at_room_exp: true, // auto-eject participants when session time is up
          },
        }),
      });
      if (resp.ok) {
        const data = (await resp.json()) as { url: string; name: string };
        return data.url;
      }
      const err = await resp.text();
      console.warn("Daily.co room creation failed:", err);
    } catch (e) {
      console.warn("Daily.co error:", e);
    }
  }

  return `https://meet.jit.si/${roomName}`;
}

export async function deleteMeetingRoom(roomUrl: string): Promise<void> {
  if (!DAILY_API_KEY) return;
  try {
    const roomName = roomUrl.split("/").pop();
    if (!roomName || roomUrl.includes("jit.si")) return;

    await fetch(`https://api.daily.co/v1/rooms/${roomName}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    });
  } catch (e) {
    console.warn("Daily.co room deletion error:", e);
  }
}

export async function createMeetingToken(
  roomUrl: string,
  userName: string,
  userId: string,
  scheduledAt?: Date | null,
  durationMinutes?: number | null,
): Promise<string | null> {
  if (!DAILY_API_KEY) return null;
  try {
    const roomName = roomUrl.split("/").pop();
    if (!roomName) return null;

    const sessionDuration = (durationMinutes ?? 60) * 60;
    const expBase = scheduledAt ? scheduledAt.getTime() / 1000 : Math.floor(Date.now() / 1000);
    const tokenExp = Math.floor(expBase) + sessionDuration + 15 * 60;

    const resp = await fetch("https://api.daily.co/v1/meeting-tokens", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${DAILY_API_KEY}`,
      },
      body: JSON.stringify({
        properties: {
          room_name: roomName,
          user_name: userName,
          user_id: userId,
          exp: tokenExp,
          is_owner: false,
          eject_at_token_exp: true,
        },
      }),
    });
    if (resp.ok) {
      const data = (await resp.json()) as { token: string };
      return data.token;
    }
    const err = await resp.text();
    console.warn("Daily.co token creation failed:", err);
  } catch (e) {
    console.warn("Daily.co token error:", e);
  }
  return null;
}
