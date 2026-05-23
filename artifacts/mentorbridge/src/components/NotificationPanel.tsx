import { useState } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@clerk/react";
import { useQuery } from "@tanstack/react-query";
import { getListNotificationsQueryOptions, useMarkAllNotificationsRead, useMarkNotificationRead } from "@workspace/api-client-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

const TYPE_ICONS: Record<string, string> = {
  booking_created: "📋",
  payment_confirmed: "💳",
  booking_approved: "✅",
  booking_rejected: "❌",
  counter_proposed: "🔄",
  counter_accepted: "✅",
  counter_declined: "❌",
  session_confirmed: "📅",
  chat_message: "💬",
};

export default function NotificationPanel() {
  const { isSignedIn } = useAuth();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  const { data: notifications = [], refetch } = useQuery({
    ...getListNotificationsQueryOptions(),
    enabled: !!isSignedIn,
    refetchInterval: isSignedIn ? 30000 : false,
  });

  const { mutate: markAllRead } = useMarkAllNotificationsRead();
  const { mutate: markRead } = useMarkNotificationRead();

  const unread = notifications.filter((n) => !n.isRead).length;

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
  }

  function handleMarkAllRead() {
    markAllRead(undefined, { onSuccess: () => refetch() });
  }

  function handleClickNotification(notif: { id: number; isRead: boolean; link?: string | null }) {
    if (!notif.isRead) {
      markRead({ notificationId: notif.id }, { onSuccess: () => refetch() });
    }
    if (notif.link) {
      setOpen(false);
      setLocation(notif.link);
    }
  }

  function timeAgo(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  if (!isSignedIn) return null;

  return (
    <DropdownMenu open={open} onOpenChange={handleOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative p-2 rounded-full hover:bg-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          data-testid="notification-bell"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full bg-destructive text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-semibold text-sm text-foreground">Notifications</span>
          {unread > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-primary hover:underline"
              data-testid="mark-all-read"
            >
              Mark all read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="divide-y divide-border">
              {notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleClickNotification(notif)}
                  data-testid={`notification-${notif.id}`}
                  className={cn(
                    "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex gap-3 items-start",
                    !notif.isRead && "bg-primary/5"
                  )}
                >
                  <span className="text-base mt-0.5 shrink-0">
                    {TYPE_ICONS[notif.type] ?? "🔔"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("text-sm font-medium truncate", !notif.isRead ? "text-foreground" : "text-muted-foreground")}>
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span className="shrink-0 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1">{timeAgo(notif.createdAt)}</p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="px-4 py-2 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-muted-foreground"
            onClick={() => { setOpen(false); setLocation("/dashboard"); }}
            data-testid="view-all-notifications"
          >
            Go to dashboard
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
