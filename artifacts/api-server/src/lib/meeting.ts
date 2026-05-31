import crypto from "crypto";

const DAILY_API_KEY = process.env.DAILY_API_KEY;

export async function createMeetingRoom(bookingId: number): Promise<string> {
  const roomName = `gomindscout-${bookingId}-${crypto.randomBytes(4).toString("hex")}`;

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
          privacy: "public",
          properties: {
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14,
            enable_chat: true,
            enable_screenshare: true,
            start_video_off: false,
            start_audio_off: false,
            enable_knocking: false,
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
      console.warn("Daily.co error, falling back to Jitsi:", e);
    }
  }

  return `https://meet.jit.si/${roomName}`;
}

export async function createMeetingToken(roomUrl: string, userName: string, userId: string): Promise<string | null> {
  if (!DAILY_API_KEY) return null;
  try {
    const roomName = roomUrl.split("/").pop();
    if (!roomName) return null;

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
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
          is_owner: false,
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
