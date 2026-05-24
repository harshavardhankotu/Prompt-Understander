import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useListNotifications, useMarkNotificationsRead, getListNotificationsQueryKey } from "@omnibid/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  new_bid: "New Bid",
  bid_accepted: "Bid Accepted",
  bid_rejected: "Bid Rejected",
  requirement_expired: "Expired",
};

export default function Notifications() {
  const qc = useQueryClient();
  const { data: notifications, isLoading } = useListNotifications();
  const markReadMutation = useMarkNotificationsRead();

  const unreadIds = notifications?.filter((n) => !n.isRead).map((n) => n.id) ?? [];

  const handleMarkAllRead = () => {
    if (!unreadIds.length) return;
    markReadMutation.mutate(
      { data: { ids: unreadIds } },
      { onSuccess: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() }) }
    );
  };

  return (
    <Layout>
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-xl font-bold">Notifications</h1>
          {unreadIds.length > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead} disabled={markReadMutation.isPending} data-testid="button-mark-all-read">
              <CheckCheck className="h-4 w-4 mr-1.5" />
              Mark all read
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : notifications?.length ? (
          <div className="space-y-2">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-xl border transition-colors ${notif.isRead ? "border-border bg-background" : "border-primary/20 bg-primary/5"}`}
                data-testid={`card-notification-${notif.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 flex-1">
                    <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${notif.isRead ? "bg-transparent" : "bg-primary"}`} />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {TYPE_LABELS[notif.type] ?? notif.type}
                        </Badge>
                      </div>
                      <p className="text-sm mt-1">{notif.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notif.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No notifications yet</p>
            <p className="text-sm mt-1">You'll see bid activity and updates here</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
