import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGetMySubscription, useUpgradeSubscription, getGetMySubscriptionQueryKey } from "@omnibid/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2, Loader2, Zap } from "lucide-react";

const PLANS = [
  {
    id: "free" as const,
    name: "Free",
    price: "₹0",
    period: "forever",
    features: ["5 bids/month", "Basic profile", "Standard listing"],
    color: "border-border",
    badge: "",
  },
  {
    id: "starter" as const,
    name: "Starter",
    price: "₹499",
    period: "per month",
    features: ["30 bids/month", "2 highlighted bids/month", "Priority support"],
    color: "border-primary",
    badge: "Popular",
  },
  {
    id: "pro" as const,
    name: "Pro",
    price: "₹999",
    period: "per month",
    features: ["Unlimited bids", "10 highlighted bids/month", "Priority in search", "Analytics dashboard"],
    color: "border-purple-500",
    badge: "Best Value",
  },
];

export default function Subscriptions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: sub, isLoading } = useGetMySubscription();
  const upgradeMutation = useUpgradeSubscription();

  const handleUpgrade = (plan: "free" | "starter" | "pro") => {
    upgradeMutation.mutate(
      { data: { plan } },
      {
        onSuccess: () => {
          toast({ title: "Plan upgraded!", description: `You are now on the ${plan} plan.` });
          qc.invalidateQueries({ queryKey: getGetMySubscriptionQueryKey() });
        },
        onError: () => toast({ title: "Error", description: "Upgrade failed", variant: "destructive" }),
      }
    );
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Provider Plans</h1>
          <p className="text-muted-foreground mt-2">
            Choose a plan that fits your bidding needs. All plans include access to OmniBid's marketplace.
          </p>
          {!isLoading && sub && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Zap className="h-3.5 w-3.5" />
              Current plan: <span className="capitalize">{sub.plan}</span>
              {" • "}{sub.bidsRemaining === 999 ? "Unlimited" : sub.bidsRemaining} bids remaining
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan) => {
            const isCurrent = sub?.plan === plan.id;
            return (
              <Card key={plan.id} className={`border-2 relative ${plan.color} ${isCurrent ? "shadow-md" : ""}`}>
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className={`text-xs px-3 ${plan.id === "pro" ? "bg-purple-600" : "bg-primary"}`}>
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-3 pt-5">
                  <CardTitle className="text-lg">{plan.name}</CardTitle>
                  <div>
                    <span className="text-3xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground text-sm ml-1">/{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || upgradeMutation.isPending}
                    onClick={() => !isCurrent && handleUpgrade(plan.id)}
                    data-testid={`button-plan-${plan.id}`}
                  >
                    {upgradeMutation.isPending && !isCurrent ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCurrent ? (
                      "Current Plan"
                    ) : (
                      `Switch to ${plan.name}`
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Payments are simulated for MVP. No real charges will be made. Razorpay integration coming soon.
        </p>
      </div>
    </Layout>
  );
}
