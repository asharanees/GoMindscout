import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, PhoneOff, Video } from "lucide-react";
import DailyCall from "@daily-co/daily-js";
import { useToast } from "@/hooks/use-toast";

interface MeetingRoomProps {
  bookingId: number;
  meetingLink: string;
  open: boolean;
  onClose: () => void;
}

export default function MeetingRoom({ bookingId, meetingLink, open, onClose }: MeetingRoomProps) {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!open || !meetingLink) return;

    setLoading(true);
    setError(null);
    setJoined(false);

    let cancelled = false;

    async function init() {
      try {
        const res = await fetch(`/api/meetings/${bookingId}/token`, { method: "POST" });
        if (!res.ok) throw new Error("Failed to get meeting token");
        const data = await res.json();

        if (cancelled) return;

        const call = DailyCall.createCallObject({
          url: data.meetingLink,
          token: data.token || undefined,
          showLeaveButton: false,
          showFullscreenButton: true,
          showLocalVideo: true,
          showParticipantsBar: true,
          iframeStyle: {
            width: "100%",
            height: "100%",
            border: "0",
            borderRadius: "0",
          },
        });

        callRef.current = call;

        call.on("joined-meeting", () => {
          setJoined(true);
          fetch(`/api/meetings/${bookingId}/join`, { method: "POST" }).catch(() => {});
        });

        call.on("error", (e: any) => {
          console.error("Daily.co error:", e);
          setError(e?.errorMsg || "Meeting connection failed");
        });

        call.on("left-meeting", () => {
          setJoined(false);
          fetch(`/api/meetings/${bookingId}/leave`, { method: "POST" }).catch(() => {});
        });

        if (containerRef.current) {
          await call.join({
            url: data.meetingLink,
            token: data.token || undefined,
          });
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to join meeting");
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (callRef.current) {
        callRef.current.leave().catch(() => {});
        callRef.current.destroy();
        callRef.current = null;
      }
    };
  }, [open, bookingId, meetingLink, toast]);

  function handleLeave() {
    if (callRef.current) {
      callRef.current.leave().catch(() => {});
      callRef.current.destroy();
      callRef.current = null;
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleLeave()}>
      <DialogContent className="max-w-4xl w-full h-[80vh] p-0 flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0">
          <DialogTitle className="text-base flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            Meeting Room
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 relative bg-black min-h-0">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="flex flex-col items-center gap-3 text-white">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Loading meeting room...</p>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="text-center text-white px-6">
                <p className="text-sm">{error}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 text-white border-white/30 hover:bg-white/10"
                  onClick={() => window.open(meetingLink, "_blank")}
                >
                  Open in new tab
                </Button>
              </div>
            </div>
          )}
          <div ref={containerRef} className="w-full h-full" />
        </div>

        <div className="px-4 py-3 border-t border-border shrink-0 flex items-center justify-between bg-background">
          <p className="text-xs text-muted-foreground">
            {joined ? "Joined - your attendance is being tracked" : "Preparing room..."}
          </p>
          <Button
            size="sm"
            variant="destructive"
            className="gap-1"
            onClick={handleLeave}
            data-testid="leave-meeting-btn"
          >
            <PhoneOff className="h-4 w-4" />
            Leave Meeting
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
