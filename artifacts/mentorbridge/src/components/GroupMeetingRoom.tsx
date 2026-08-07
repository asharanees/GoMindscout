import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, PhoneOff, Video } from "lucide-react";
import DailyCall from "@daily-co/daily-js";
import { useToast } from "@/hooks/use-toast";
import { useGetGroupSessionToken, getGetGroupSessionTokenQueryKey } from "@workspace/api-client-react";

interface GroupMeetingRoomProps {
  sessionId: number;
  meetingLink: string;
  open: boolean;
  onClose: () => void;
}

export default function GroupMeetingRoom({ sessionId, meetingLink, open, onClose }: GroupMeetingRoomProps) {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  const { data: tokenData, isLoading, error: tokenError } = useGetGroupSessionToken(sessionId, {
    query: { enabled: open && !!sessionId, queryKey: getGetGroupSessionTokenQueryKey(sessionId) }
  });

  useEffect(() => {
    if (tokenError) {
      setError(tokenError.message || "Failed to get meeting token");
      toast({ title: "Error", description: "Failed to get meeting token", variant: "destructive" });
    }
  }, [tokenError, toast]);

  useEffect(() => {
    if (!open || !meetingLink || !tokenData) return;

    setError(null);
    setJoined(false);

    let cancelled = false;

    async function init() {
      try {
        if (cancelled) return;

        if (!containerRef.current) {
          throw new Error("Meeting container not available");
        }

        const call = DailyCall.createFrame(containerRef.current, {
          url: tokenData!.meetingLink,
          token: tokenData!.token || undefined,
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
        });

        call.on("error", (e: any) => {
          console.error("Daily.co error:", e);
          setError(e?.errorMsg || "Meeting connection failed");
        });

        call.on("left-meeting", () => {
          setJoined(false);
        });
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || "Failed to join meeting");
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (callRef.current) {
        try {
          callRef.current.leave().catch(() => {});
          callRef.current.destroy();
        } catch {
          // ignore
        }
        callRef.current = null;
      }
    };
  }, [open, meetingLink, tokenData, toast]);

  function handleLeave() {
    if (callRef.current) {
      try {
        callRef.current.leave().catch(() => {});
        callRef.current.destroy();
      } catch {
        // ignore
      }
      callRef.current = null;
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleLeave()}>
      <DialogContent className="max-w-4xl w-full h-[80vh] p-0 flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0 bg-background">
          <DialogTitle className="text-base flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            Group Session Room
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 relative bg-black min-h-0">
          {isLoading && (
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
            {joined ? "Joined session" : "Preparing room..."}
          </p>
          <Button
            size="sm"
            variant="destructive"
            className="gap-1"
            onClick={handleLeave}
            data-testid="leave-meeting-btn"
          >
            <PhoneOff className="h-4 w-4" />
            Leave Session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}