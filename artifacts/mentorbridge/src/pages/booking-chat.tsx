import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useAuth } from "@clerk/react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowLeft, Send } from "lucide-react";
import { useListChatMessages, useSendChatMessage, useGetBooking, getListChatMessagesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function BookingChatPage() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const [, setLocation] = useLocation();
  const { userId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const bId = parseInt(bookingId);
  const { data: booking, isLoading: bookingLoading } = useGetBooking(bId);
  const { data: messages, isLoading: messagesLoading } = useListChatMessages(bId);
  const { mutate: send, isPending: sending } = useSendChatMessage();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: getListChatMessagesQueryKey(bId) });
    }, 5000);
    return () => clearInterval(interval);
  }, [bId, queryClient]);

  function handleSend() {
    if (!message.trim()) return;
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

  if (bookingLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
          <Skeleton className="h-96 w-full" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Booking not found.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 flex flex-col">
        <div className="mb-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/dashboard")} className="gap-1.5" data-testid="back-btn">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-xl font-bold">Chat</h1>
            <p className="text-sm text-muted-foreground">
              Booking #{booking.id} with {booking.mentorName ?? booking.menteeName}
            </p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-800">
          Keep all communication and payments on-platform for your protection.
        </div>

        <Card className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ maxHeight: "60vh" }}>
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
                const isMe = msg.senderId === (booking.menteeId);
                return (
                  <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={msg.senderAvatarUrl ?? undefined} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {(msg.senderName ?? "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`max-w-[70%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-1`}>
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

          <div className="border-t border-border p-3 flex gap-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Enter to send)"
              className="resize-none min-h-[60px] text-sm"
              data-testid="chat-input"
            />
            <Button onClick={handleSend} disabled={sending || !message.trim()} size="sm" className="self-end shrink-0" data-testid="send-btn">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
      <Footer />
    </div>
  );
}
