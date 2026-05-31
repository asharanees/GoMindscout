import crypto from "crypto";

export async function createMeetingRoom(bookingId: number): Promise<string> {
  const roomName = `gomindscout-${bookingId}-${crypto.randomBytes(4).toString("hex")}`;
  return `https://meet.jit.si/${roomName}`;
}
