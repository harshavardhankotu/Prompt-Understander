import { useParams } from "wouter";
import Layout from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetUser, useGetUserReviews, getGetUserQueryKey, getGetUserReviewsQueryKey } from "@omnibid/api-client-react";
import { MapPin, Shield, Star, Trophy, UserCircle } from "lucide-react";

const PLAN_BADGE: Record<string, { label: string; cls: string }> = {
  free: { label: "Free", cls: "bg-gray-100 text-gray-700" },
  starter: { label: "Starter", cls: "bg-blue-100 text-blue-700" },
  pro: { label: "Pro", cls: "bg-purple-100 text-purple-700" },
};

export default function Profile() {
  const { id } = useParams<{ id: string }>();

  const { data: user, isLoading } = useGetUser(id, {
    query: { queryKey: getGetUserQueryKey(id), enabled: !!id },
  });

  const { data: reviews, isLoading: reviewsLoading } = useGetUserReviews(id, {
    query: { queryKey: getGetUserReviewsQueryKey(id), enabled: !!id },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto space-y-4">
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-16 text-muted-foreground">User not found</div>
      </Layout>
    );
  }

  const plan = user.subscriptionPlan ? PLAN_BADGE[user.subscriptionPlan] : null;

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary flex-shrink-0">
                {user.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold">{user.name}</h1>
                  {user.isVerified && (
                    <Shield className="h-4 w-4 text-primary" aria-label="Verified" />
                  )}
                  {plan && (
                    <Badge className={`text-xs capitalize ${plan.cls}`}>{plan.label}</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1 flex-wrap">
                  <span className="capitalize">{user.role}</span>
                  {user.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {user.city}{user.state ? `, ${user.state}` : ""}
                    </span>
                  )}
                  <span>Joined {new Date(user.createdAt).getFullYear()}</span>
                </div>

                <div className="flex items-center gap-4 mt-3">
                  <div className="text-center">
                    <div className="font-bold text-lg">{user.trustScore}</div>
                    <div className="text-xs text-muted-foreground">Trust Score</div>
                  </div>
                  {user.avgRating && (
                    <div className="text-center">
                      <div className="font-bold text-lg flex items-center gap-1 justify-center">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        {user.avgRating.toFixed(1)}
                      </div>
                      <div className="text-xs text-muted-foreground">{user.reviewCount} reviews</div>
                    </div>
                  )}
                  {user.totalBidsWon > 0 && (
                    <div className="text-center">
                      <div className="font-bold text-lg flex items-center gap-1 justify-center">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        {user.totalBidsWon}
                      </div>
                      <div className="text-xs text-muted-foreground">Jobs Won</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviews */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Reviews ({user.reviewCount})</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {reviewsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
              </div>
            ) : reviews?.length ? (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="p-3 rounded-lg border border-border" data-testid={`card-review-${review.id}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{review.reviewerName}</span>
                      <div className="flex">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-3.5 w-3.5 ${i < review.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`}
                          />
                        ))}
                      </div>
                    </div>
                    {review.comment && <p className="text-sm text-muted-foreground mt-1">{review.comment}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{new Date(review.createdAt).toLocaleDateString("en-IN")}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <UserCircle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No reviews yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
