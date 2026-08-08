import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, PhoneOff, Video } from "lucide-react";
import DailyIframe from "@daily-co/daily-js";
import { useToast } from "@/hooks/use-toast";
import { useGetGroupSessionToken, getGetGroupSessionTokenQueryKey } from "@workspace/api-client-react";

interface GroupMeetingRoomProps {
  sessionId: number;
  meetingLink?: string; // kept for API compatibility but unused — link comes from token endpoint
  open: boolean;
  onClose: () => void;
}

export default function GroupMeetingRoom({ sessionId, open, onClose }: GroupMeetingRoomProps) {
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  const { data: tokenData, isLoading: tokenLoading, error: tokenError } = useGetGroupSessionToken(sessionId, {
    query: { enabled: open && !!sessionId, queryKey: getGetGroupSessionTokenQueryKey(sessionId) },
  });

  useEffect(() => {
    if (!open) return;
    if (tokenLoading) {
      setLoading(true);
      setError(null);
      return;
    }
    if (tokenError || !tokenData) {
      const msg = (tokenError as any)?.message || "Failed to get meeting token";
      setError(msg);
      setLoading(false);
      toast({ title: "Error", description: msg, variant: "destructive" });
      return;
    }

    setLoading(true);
    setError(null);
    setJoined(false);

    let cancelled = false;

    async function destroyExisting() {
      try {
        const existing = DailyIframe.getCallInstance();
        if (existing) {
          await existing.leave().catch(() => {});
          await existing.destroy();
        }
      } catch {}
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      callRef.current = null;
    }

    async function init() {
      try {
        await destroyExisting();

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
        });

        await call.join({
          url: tokenData.meetingLink,
          token: tokenData.token || undefined,
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
  }, [open, tokenData, tokenLoading, tokenError, toast]);

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
        <DialogHeader className="px-4 py-3 border-b border-border shrink-0 bg-background">
          <DialogTitle className="text-base flex items-center gap-2">
            <Video className="h-4 w-4 text-primary" />
            Group Session Room
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 relative bg-black min-h-0">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
              <div className="flex flex-col items-center gap-3 text-white">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">
                  {tokenLoading ? "Getting meeting token…" : "Joining session room…"}
                </p>
              </div>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
              <div className="text-center text-white px-6">
                <p className="text-sm font-medium mb-1">Could not join the session</p>
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
            {joined ? "Joined session" : "Preparing room…"}
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
