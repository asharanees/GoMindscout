import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, PhoneOff, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MeetingRoomProps {
  bookingId: number;
  meetingLink: string;
  open: boolean;
  onClose: () => void;
}

export default function MeetingRoom({ bookingId, meetingLink, open, onClose }: MeetingRoomProps) {
  const { toast } = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const dailyUrl = useRef<string>("");

  useEffect(() => {
    if (!open || !meetingLink) return;

    setLoading(true);
    setError(null);
    setToken(null);
    setJoined(false);

    // Get token
    fetch(`/api/meetings/${bookingId}/token`, { method: "POST" })
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to get meeting token");
        const data = await res.json();
        setToken(data.token || null);
        // Build iframe URL with token
        if (data.token) {
          dailyUrl.current = `${data.meetingLink}?t=${data.token}`;
        } else {
          dailyUrl.current = data.meetingLink;
        }
      })
      .catch((err) => {
        setError(err.message);
        toast({ title: "Error", description: err.message, variant: "destructive" });
      })
      .finally(() => setLoading(false));
  }, [open, bookingId, meetingLink, toast]);

  // Log join when iframe loads
  function handleIframeLoad() {
    if (!joined) {
      setJoined(true);
      fetch(`/api/meetings/${bookingId}/join`, { method: "POST" }).catch(() => {});
    }
  }

  // Log leave on close
  function handleClose() {
    if (joined) {
      fetch(`/api/meetings/${bookingId}/leave`, { method: "POST" }).catch(() => {});
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
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
          {dailyUrl.current && !error && (
            <iframe
              ref={iframeRef}
              src={dailyUrl.current}
              className="w-full h-full border-0"
              allow="camera; microphone; fullscreen; display-capture"
              onLoad={handleIframeLoad}
              title="Meeting Room"
            />
          )}
        </div>

        <div className="px-4 py-3 border-t border-border shrink-0 flex items-center justify-between bg-background">
          <p className="text-xs text-muted-foreground">
            {joined ? "Joined - your attendance is being tracked" : "Preparing room..."}
          </p>
          <Button
            size="sm"
            variant="destructive"
            className="gap-1"
            onClick={handleClose}
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
