import { useState } from "react";
import { useParams, useLocation } from "wouter";
import Layout from "@/components/layout";
import { Countdown } from "@/components/countdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useGetRequirement,
  getGetRequirementQueryKey,
  useAcceptBid,
  useGetRequirementStats,
  getGetRequirementStatsQueryKey,
  getListBidsQueryKey,
} from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getCategoryIcon } from "@/lib/category-icons";
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  IndianRupee,
  MapPin,
  MessageSquare,
  Shield,
  Star,
  Trophy,
  User,
  Zap,
} from "lucide-react";

type SortBy = "lowest_price" | "highest_rating" | "fastest_start";

export default function RequirementDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [sortBy, setSortBy] = useState<SortBy>("lowest_price");

  const { data: req, isLoading } = useGetRequirement(id, {
    query: { queryKey: getGetRequirementQueryKey(id) },
  });

  const { data: stats } = useGetRequirementStats(id, {
    query: { queryKey: getGetRequirementStatsQueryKey(id), enabled: !!id },
  });

  const acceptBidMutation = useAcceptBid();

  const isOwner = user?.id === req?.buyerId;
  const isProvider = user?.role === "provider" || user?.role === "both";
  const canBid = isProvider && req?.status === "open" && !isOwner;

  const sortedBids = [...(req?.bids ?? [])].sort((a, b) => {
    if (a.isHighlighted && !b.isHighlighted) return -1;
    if (!a.isHighlighted && b.isHighlighted) return 1;
    if (sortBy === "lowest_price") return a.bidAmount - b.bidAmount;
    if (sortBy === "highest_rating") return (b.providerAvgRating ?? 0) - (a.providerAvgRating ?? 0);
    return 0;
  });

  const handleAcceptBid = (bidId: string) => {
    if (!id) return;
    acceptBidMutation.mutate(
      { id, data: { bidId } },
      {
        onSuccess: () => {
          toast({ title: "Bid accepted!", description: "The provider has been notified." });
          qc.invalidateQueries({ queryKey: getGetRequirementQueryKey(id) });
        },
        onError: () => toast({ title: "Error", description: "Failed to accept bid", variant: "destructive" }),
      }
    );
  };

  const Icon = req ? getCategoryIcon(req.categoryIconName) : null;

  if (isLoading) {
    return (
      <Layout>
        <div className="space-y-4 max-w-3xl mx-auto">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!req) {
    return (
      <Layout>
        <div className="text-center py-16 text-muted-foreground">
          <p className="font-medium">Requirement not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-4">
        {/* Header Card */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                {Icon && (
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Badge variant="secondary" className="text-xs">{req.categoryName}</Badge>
                    {req.isHighTicket && <Badge className="text-xs bg-amber-500 text-white">High Value</Badge>}
                    <Badge variant={req.status === "open" ? "default" : req.status === "accepted" ? "default" : "secondary"} className="text-xs capitalize">
                      {req.status}
                    </Badge>
                    {stats?.isBidWar && (
                      <span className="flex items-center gap-1 text-xs text-orange-500 font-semibold">
                        <Flame className="h-3.5 w-3.5" />
                        Bid War!
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl font-bold">{req.title}</h1>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{req.city}, {req.state}</span>
                    <span className="flex items-center gap-1"><User className="h-3 w-3" />{req.buyerName}</span>
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="flex items-center justify-end gap-0.5 text-primary font-bold text-xl">
                  <IndianRupee className="h-4 w-4" />
                  {req.maxBudget.toLocaleString("en-IN")}
                </div>
                <div className="text-xs text-muted-foreground">max budget</div>
              </div>
            </div>

            <p className="text-sm text-foreground/80 mt-3 leading-relaxed">{req.description}</p>

            {req.status === "open" && (
              <div className="flex items-center gap-4 mt-4 p-3 rounded-lg bg-muted/50">
                <div>
                  <div className="text-xs text-muted-foreground">Closes in</div>
                  <Countdown endsAt={req.auctionEndsAt} large />
                </div>
                <Separator orientation="vertical" className="h-10" />
                <div>
                  <div className="text-xs text-muted-foreground">Total bids</div>
                  <div className="text-2xl font-bold">{req.bidCount}</div>
                </div>
                {stats?.lowestBid && (
                  <>
                    <Separator orientation="vertical" className="h-10" />
                    <div>
                      <div className="text-xs text-muted-foreground">Lowest bid</div>
                      <div className="text-2xl font-bold text-green-600">₹{stats.lowestBid.toLocaleString("en-IN")}</div>
                    </div>
                  </>
                )}
              </div>
            )}

            {canBid && (
              <Button
                className="w-full mt-3 font-semibold"
                onClick={() => setLocation(`/bid/new/${id}`)}
                data-testid="button-place-bid"
              >
                <Gavel className="h-4 w-4 mr-1.5" />
                Place Your Bid
              </Button>
            )}

            {!user && (
              <Button className="w-full mt-3" onClick={() => setLocation("/login")} data-testid="button-login-to-bid">
                Login to Place a Bid
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Bids */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{req.bids.length} Bids Received</CardTitle>
              <Tabs value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                <TabsList className="h-7 text-xs">
                  <TabsTrigger value="lowest_price" className="text-xs px-2">Lowest Price</TabsTrigger>
                  <TabsTrigger value="highest_rating" className="text-xs px-2">Top Rated</TabsTrigger>
                  <TabsTrigger value="fastest_start" className="text-xs px-2">Fastest</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {sortedBids.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No bids yet. Be the first to bid!</p>
              </div>
            )}
            {sortedBids.map((bid) => (
              <div
                key={bid.id}
                className={`rounded-xl border p-4 ${bid.isHighlighted ? "border-amber-400 bg-amber-50/50 dark:bg-amber-950/10" : "border-border"} ${bid.status === "accepted" ? "border-green-500 bg-green-50/50 dark:bg-green-950/10" : ""}`}
                data-testid={`card-bid-${bid.id}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                      {bid.providerName[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-sm">{bid.providerName}</span>
                        {bid.providerIsVerified && <Shield className="h-3.5 w-3.5 text-primary" />}
                        {bid.isHighlighted && <Badge className="text-[10px] bg-amber-500 text-white px-1.5 py-0">Featured</Badge>}
                        {bid.status === "accepted" && <Badge className="text-[10px] bg-green-500 text-white px-1.5 py-0"><CheckCircle2 className="h-2.5 w-2.5 mr-0.5 inline" />Accepted</Badge>}
                        {bid.providerSubscriptionPlan && bid.providerSubscriptionPlan !== "free" && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{bid.providerSubscriptionPlan}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {bid.providerAvgRating && (
                          <span className="flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {bid.providerAvgRating.toFixed(1)} ({bid.providerReviewCount})
                          </span>
                        )}
                        {bid.providerCity && <span><MapPin className="h-3 w-3 inline mr-0.5" />{bid.providerCity}</span>}
                        <span className="flex items-center gap-0.5"><Zap className="h-3 w-3" />{bid.estimatedCompletion}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="flex items-center justify-end gap-0.5 text-primary font-bold text-lg">
                      <IndianRupee className="h-3.5 w-3.5" />
                      {bid.bidAmount.toLocaleString("en-IN")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {((bid.bidAmount / req.maxBudget) * 100).toFixed(0)}% of budget
                    </div>
                  </div>
                </div>

                <p className="text-sm mt-2 text-foreground/80">{bid.message}</p>

                {bid.proofOfWork && (
                  <p className="text-xs mt-1.5 text-muted-foreground bg-muted/50 rounded-lg p-2">
                    <Trophy className="h-3 w-3 inline mr-1" />
                    {bid.proofOfWork}
                  </p>
                )}

                {isOwner && req.status === "open" && bid.status === "active" && (
                  <Button
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() => handleAcceptBid(bid.id)}
                    disabled={acceptBidMutation.isPending}
                    data-testid={`button-accept-bid-${bid.id}`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                    Accept this Bid
                  </Button>
                )}

                {bid.status === "accepted" && bid.providerId && (
                  <div className="mt-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                    <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-2">Bid Accepted! Connect with the provider:</p>
                    <a
                      href={`https://wa.me/91${bid.providerName}?text=${encodeURIComponent(`Hi, I accepted your OmniBid for "${req.title}". Let's connect!`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400 hover:underline"
                      data-testid="link-whatsapp"
                    >
                      <ExternalLink className="h-3 w-3" />
                      Chat on WhatsApp
                    </a>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function Gavel({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 12-8.5 8.5c-.83.83-2.17.83-3 0 0 0 0 0 0 0a2.12 2.12 0 0 1 0-3L12 9" />
      <path d="M17.64 15 22 10.64" />
      <path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91" />
    </svg>
  );
}
