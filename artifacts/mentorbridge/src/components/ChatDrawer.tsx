import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, Send } from "lucide-react";
import { useListChatMessages, useSendChatMessage, useGetBooking, getListChatMessagesQueryKey, getGetBookingQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ChatDrawerProps {
  bookingId: number | null;
  onClose: () => void;
}

export default function ChatDrawer({ bookingId, onClose }: ChatDrawerProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const bId = bookingId ?? 0;
  const { data: booking } = useGetBooking(bId, { query: { enabled: !!bookingId, queryKey: getGetBookingQueryKey(bId) } });
  const { data: messages, isLoading: messagesLoading } = useListChatMessages(bId, { query: { enabled: !!bookingId, queryKey: getListChatMessagesQueryKey(bId) } });
  const { mutate: send, isPending: sending } = useSendChatMessage();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!bookingId) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getListChatMessagesQueryKey(bId) });
    }, 5000);
    return () => clearInterval(interval);
  }, [bookingId, bId, queryClient]);

  function handleSend() {
    if (!message.trim() || !bookingId) return;
    send(
      { bookingId: bId, data: { content: message.trim() } },
      {
        onSuccess: (data: any) => {
          setMessage("");
          queryClient.invalidateQueries({ queryKey: getListChatMessagesQueryKey(bId) });
          if (data.warning) {
            toast({ title: "Platform reminder", description: data.warning, variant: "destructive" });
          }
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const otherName = booking?.mentorName ?? booking?.menteeName ?? "Chat";

  return (
    <Sheet open={!!bookingId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-4 py-3 border-b border-border shrink-0">
          <SheetTitle className="text-base">Chat with {otherName}</SheetTitle>
          <p className="text-xs text-muted-foreground">Booking #{booking?.id}</p>
        </SheetHeader>

        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 shrink-0">
          Keep all communication and payments on-platform for your protection.
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messagesLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <Skeleton className="h-16 flex-1" />
              </div>
            ))
          ) : !messages || messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg: any) => {
              const isMe = msg.senderId === (booking?.menteeId ?? 0);
              return (
                <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={msg.senderAvatarUrl ?? undefined} />
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {(msg.senderName ?? "?").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    <span className="text-xs text-muted-foreground">{msg.senderName}</span>
                    <div className={`rounded-2xl px-3 py-2 text-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {msg.content}
                    </div>
                    {msg.isFlagged && (
                      <div className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        {msg.flagReason}
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground">{new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-border p-3 flex gap-2 shrink-0">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send)"
            className="resize-none min-h-[60px] text-sm"
            data-testid="chat-drawer-input"
          />
          <Button onClick={handleSend} disabled={sending || !message.trim()} size="sm" className="self-end shrink-0" data-testid="chat-drawer-send">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
