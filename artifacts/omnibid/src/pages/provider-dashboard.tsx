import { useLocation } from "wouter";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useGetProviderDashboard } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { getCategoryIcon } from "@/lib/category-icons";
import { IndianRupee, Search, Target, Trophy, TrendingUp, Zap } from "lucide-react";
import { Link } from "wouter";

const PLAN_COLORS: Record<string, string> = {
  free: "bg-gray-100 text-gray-700",
  starter: "bg-blue-100 text-blue-700",
  pro: "bg-purple-100 text-purple-700",
};

export default function ProviderDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data, isLoading } = useGetProviderDashboard();

  const stats = [
    { label: "Active Bids", value: data?.activeBids ?? 0, icon: Target, color: "text-blue-600" },
    { label: "Bids Won", value: data?.wonBids ?? 0, icon: Trophy, color: "text-amber-600" },
    { label: "Win Rate", value: `${data?.winRate ?? 0}%`, icon: TrendingUp, color: "text-green-600" },
    { label: "Total Earned", value: `₹${(data?.totalEarned ?? 0).toLocaleString("en-IN")}`, icon: IndianRupee, color: "text-purple-600" },
  ];

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Provider Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {user?.name?.split(" ")[0]}</p>
          </div>
          <Button onClick={() => setLocation("/requirements")} data-testid="button-browse">
            <Search className="h-4 w-4 mr-1.5" />
            Browse Requirements
          </Button>
        </div>

        {/* Subscription Status */}
        {!isLoading && data && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">Plan:</span>
                      <Badge className={`capitalize text-xs ${PLAN_COLORS[data.subscriptionPlan] ?? ""}`}>
                        {data.subscriptionPlan}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {data.bidsRemaining === 999 ? "Unlimited bids" : `${data.bidsRemaining} bids remaining`}
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => setLocation("/subscriptions")} data-testid="button-upgrade">
                  <Zap className="h-3.5 w-3.5 mr-1" />
                  Upgrade
                </Button>
              </div>
              {data.bidsRemaining !== 999 && (
                <Progress value={(data.bidsRemaining / (data.subscriptionPlan === "starter" ? 30 : 5)) * 100} className="h-1.5 mt-3" />
              )}
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
            : stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <Card key={stat.label}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs text-muted-foreground">{stat.label}</p>
                          <p className="text-2xl font-bold mt-0.5">{stat.value}</p>
                        </div>
                        <Icon className={`h-5 w-5 ${stat.color}`} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Recent Bids */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Recent Bids</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)
              ) : data?.recentBids?.length ? (
                data.recentBids.map((bid) => (
                  <Link key={bid.id} href={`/requirements/${bid.requirementId}`}>
                    <div className="p-3 rounded-lg border border-border hover:border-primary/30 transition-colors cursor-pointer" data-testid={`card-bid-${bid.id}`}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate flex-1">{bid.requirement?.title ?? "Requirement"}</p>
                        <Badge variant={bid.status === "accepted" ? "default" : bid.status === "active" ? "secondary" : "outline"} className="text-xs ml-2 capitalize">
                          {bid.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5 font-semibold text-primary">
                          <IndianRupee className="h-3 w-3" />{bid.bidAmount.toLocaleString("en-IN")}
                        </span>
                        <span>{bid.requirement?.city}</span>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No bids yet.{" "}
                  <button onClick={() => setLocation("/requirements")} className="text-primary hover:underline" data-testid="link-browse">
                    Browse requirements
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category Breakdown */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Category Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)
              ) : data?.categoryBreakdown?.length ? (
                data.categoryBreakdown.map((cat) => (
                  <div key={cat.categoryName} className="flex items-center justify-between p-2 rounded-lg bg-muted/50" data-testid={`row-category-${cat.categoryName}`}>
                    <span className="text-sm font-medium">{cat.categoryName}</span>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{cat.bidCount} bids</span>
                      {cat.wonCount > 0 && <Badge variant="outline" className="text-xs">{cat.wonCount} won</Badge>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">No data yet</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
