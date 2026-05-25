import { useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useGetProviderDashboard,
  useGetKycStatus,
  getGetKycStatusQueryKey,
  useVerifyKyc,
} from "@omnibid/api-client-react";
import { useAuth } from "@/lib/auth";
import { getCategoryIcon } from "@/lib/category-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle, CheckCircle2, IndianRupee, Loader2, Search, Shield,
  ShieldCheck, Target, Trophy, TrendingUp, Zap,
} from "lucide-react";
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
  const qc = useQueryClient();
  const { toast } = useToast();

  // KYC state
  const { data: kycData, isLoading: kycLoading } = useGetKycStatus({
    query: { queryKey: getGetKycStatusQueryKey(), enabled: !!user },
  });
  const verifyKyc = useVerifyKyc();
  const [aadhaar, setAadhaar] = useState("");
  const [pan, setPan] = useState("");

  const handleKycVerify = () => {
    verifyKyc.mutate(
      { aadhaarNumber: aadhaar, panNumber: pan.toUpperCase() },
      {
        onSuccess: (res) => {
          qc.invalidateQueries({ queryKey: getGetKycStatusQueryKey() });
          toast({
            title: "✅ KYC Verified!",
            description: res.message ?? "Your identity has been verified via DigiLocker.",
          });
        },
        onError: (err: any) => {
          toast({
            title: "KYC Verification Failed",
            description: err?.data?.error ?? err?.message ?? "Please check your details and try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

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

        {/* ─── DigiLocker KYC Banner ─── */}
        {!kycLoading && kycData && kycData.kycStatus !== "verified" && (
          <Card className="border-2 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/20 overflow-hidden">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-amber-800 dark:text-amber-300 text-sm">
                    Complete KYC to Start Earning
                  </h3>
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/70 mt-0.5">
                    Verify your identity via DigiLocker to unlock bidding, receive payments, and get your verified badge.
                    We&apos;ll create a Razorpay linked account for direct fund transfers.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="aadhaar-input" className="text-xs font-medium text-amber-800 dark:text-amber-300">
                    Aadhaar Number (12 digits)
                  </Label>
                  <Input
                    id="aadhaar-input"
                    placeholder="XXXX XXXX XXXX"
                    maxLength={12}
                    value={aadhaar}
                    onChange={(e) => setAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))}
                    className="mt-1 bg-white dark:bg-background"
                  />
                </div>
                <div>
                  <Label htmlFor="pan-input" className="text-xs font-medium text-amber-800 dark:text-amber-300">
                    PAN Number (e.g. ABCDE1234F)
                  </Label>
                  <Input
                    id="pan-input"
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase().slice(0, 10))}
                    className="mt-1 bg-white dark:bg-background"
                  />
                </div>
              </div>
              <Button
                id="kyc-verify-btn"
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md"
                disabled={aadhaar.length !== 12 || pan.length !== 10 || verifyKyc.isPending}
                onClick={handleKycVerify}
              >
                {verifyKyc.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying via DigiLocker…</>
                ) : (
                  <><Shield className="h-4 w-4 mr-2" />Verify KYC (DigiLocker)</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* KYC Verified Success Banner (compact) */}
        {!kycLoading && kycData?.kycStatus === "verified" && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-950/20">
            <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div>
              <span className="text-sm font-semibold text-green-800 dark:text-green-300">KYC Verified</span>
              <span className="text-xs text-green-700/70 dark:text-green-400/60 ml-2">
                DigiLocker • {kycData.kycVerifiedAt ? new Date(kycData.kycVerifiedAt).toLocaleDateString("en-IN") : ""}
              </span>
            </div>
            <Badge className="ml-auto bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />Active
            </Badge>
          </div>
        )}

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
