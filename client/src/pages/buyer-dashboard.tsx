import { useLocation } from "wouter";
import Layout from "@/components/layout";
import { RequirementCard } from "@/components/requirement-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetBuyerDashboard } from "@omnibid/api-client-react";
import { useAuth } from "@/lib/auth";
import { CheckCircle, Clock, IndianRupee, PlusCircle, Wallet } from "lucide-react";

export default function BuyerDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { data, isLoading } = useGetBuyerDashboard();

  const stats = [
    { label: "Open", value: data?.openRequirements ?? 0, icon: Clock, color: "text-blue-600" },
    { label: "Accepted", value: data?.acceptedRequirements ?? 0, icon: CheckCircle, color: "text-green-600" },
    { label: "Completed", value: data?.completedRequirements ?? 0, icon: Wallet, color: "text-purple-600" },
    { label: "Total Spent", value: data ? `₹${(data.totalSpent ?? 0).toLocaleString("en-IN")}` : "₹0", icon: IndianRupee, color: "text-amber-600" },
  ];

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Buyer Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {user?.name?.split(" ")[0]}</p>
          </div>
          <Button onClick={() => setLocation("/requirements/new")} data-testid="button-post-problem">
            <PlusCircle className="h-4 w-4 mr-1.5" />
            Post Problem
          </Button>
        </div>

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

        {/* Recent Requirements */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Recent Requirements</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/requirements?my=1")} data-testid="button-view-all">
                View all
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
              </div>
            ) : data?.recentRequirements?.length ? (
              <div className="space-y-3">
                {data.recentRequirements.map((req) => (
                  <RequirementCard key={req.id} requirement={req} />
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                <PlusCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm font-medium">No requirements yet</p>
                <Button className="mt-3" size="sm" onClick={() => setLocation("/requirements/new")} data-testid="button-post-first">
                  Post your first problem
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
