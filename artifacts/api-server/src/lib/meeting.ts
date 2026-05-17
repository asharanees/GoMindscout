import crypto from "crypto";

export async function createMeetingRoom(bookingId: number): Promise<string> {
  const roomName = `gomindscout-${bookingId}-${crypto.randomBytes(4).toString("hex")}`;

  if (process.env.DAILY_API_KEY) {
    try {
      const resp = await fetch("https://api.daily.co/v1/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
        },
        body: JSON.stringify({
          name: roomName,
          properties: {
            exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14, // 14 days
            enable_chat: true,
            enable_screenshare: true,
            start_video_off: false,
            start_audio_off: false,
          },
        }),
      });
      if (resp.ok) {
        const data = (await resp.json()) as { url: string };
        return data.url;
      }
    } catch {
      // fall through to fallback
    }
  }

  // Fallback: unique video room (no external API required)
  return `https://meet.jit.si/${roomName}`;
}
