import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, PhoneOff, Video } from "lucide-react";
import DailyIframe from "@daily-co/daily-js";
import { useToast } from "@/hooks/use-toast";

interface MeetingRoomProps {
  bookingId: number;
  open: boolean;
  onClose: () => void;
}

export default function MeetingRoom({ bookingId, open, onClose }: MeetingRoomProps) {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setError(null);
    setJoined(false);

    let cancelled = false;

    async function init() {
      try {
        const res = await fetch(`/api/meetings/${bookingId}/token`, { method: "POST" });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to get meeting token");
        }
        const data = await res.json();

        if (cancelled || !containerRef.current) return;

        const call = DailyIframe.createFrame(containerRef.current, {
          showLeaveButton: false,
          showFullscreenButton: true,
          showLocalVideo: true,
          showParticipantsBar: true,
          iframeStyle: {
            position: "absolute",
            top: "0",
            left: "0",
            width: "100%",
            height: "100%",
            border: "0",
            borderRadius: "0",
          },
        });

        callRef.current = call;

        call.on("joined-meeting", () => {
          setJoined(true);
          setLoading(false);
          fetch(`/api/meetings/${bookingId}/join`, { method: "POST" }).catch(() => {});
        });

        call.on("error", (e: any) => {
          console.error("Daily.co error:", e);
          if (!cancelled) {
            setError(e?.errorMsg || "Meeting connection failed");
            setLoading(false);
          }
        });

        call.on("left-meeting", () => {
          setJoined(false);
          fetch(`/api/meetings/${bookingId}/leave`, { method: "POST" }).catch(() => {});
        });

        await call.join({
          url: data.meetingLink,
          token: data.token || undefined,
        });
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to join meeting");
          setLoading(false);
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
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
  }, [open, bookingId, toast]);

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
            <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
              <div className="flex flex-col items-center gap-3 text-white">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Loading meeting room...</p>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
              <div className="text-center text-white px-6">
                <p className="text-sm font-medium mb-1">Could not join the meeting</p>
                <p className="text-xs text-white/60">{error}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-4 text-white border-white/30 hover:bg-white/10"
                  onClick={handleLeave}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
          <div ref={containerRef} className="absolute inset-0 w-full h-full" />
        </div>

        <div className="px-4 py-3 border-t border-border shrink-0 flex items-center justify-between bg-background">
          <p className="text-xs text-muted-foreground">
            {joined ? "Joined — your attendance is being tracked" : "Preparing room..."}
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
