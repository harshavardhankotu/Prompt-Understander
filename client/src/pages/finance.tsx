import { useState } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp, Wallet, CheckCircle2, XCircle, Clock, IndianRupee,
  Shield, AlertTriangle, Info, Zap, Building2, MessageSquare,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function authFetch(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("omnibid_token");
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers },
  });
}

const fmt = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const PROVIDER_ROLES = ["provider", "both", "solo_provider", "agency_provider"];

function creditScoreColor(score: number) {
  if (score >= 750) return "text-green-600";
  if (score >= 650) return "text-yellow-600";
  if (score >= 550) return "text-orange-500";
  return "text-red-500";
}

function creditScoreLabel(score: number) {
  if (score >= 750) return "Excellent";
  if (score >= 650) return "Good";
  if (score >= 550) return "Fair";
  return "Poor";
}

export default function FinancePage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [requestAmount, setRequestAmount] = useState(10000);
  const [showRequestForm, setShowRequestForm] = useState(false);

  const isProvider = PROVIDER_ROLES.includes(user?.role ?? "");

  const { data: eligibility, isLoading: loadingElig } = useQuery({
    queryKey: ["finance-eligibility"],
    queryFn: () => authFetch("/api/finance/eligibility").then(r => r.json()),
    enabled: !!user,
  });

  const { data: offers, isLoading: loadingOffers } = useQuery({
    queryKey: ["loan-offers"],
    queryFn: () => authFetch("/api/finance/loan-offers").then(r => r.json()),
    enabled: !!user,
  });

  const { data: whatsappElig } = useQuery({
    queryKey: ["whatsapp-eligibility"],
    queryFn: () => authFetch("/api/finance/whatsapp-pay/eligibility").then(r => r.json()),
    enabled: !!user,
  });

  const { data: upiOneWorld } = useQuery({
    queryKey: ["upi-one-world"],
    queryFn: () => authFetch("/api/finance/upi-one-world/eligibility").then(r => r.json()),
    enabled: !!user,
  });

  const requestLoan = useMutation({
    mutationFn: (amount: number) =>
      authFetch("/api/finance/loan-offers/request", {
        method: "POST",
        body: JSON.stringify({ requestedAmount: amount }),
      }).then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed");
        return d;
      }),
    onSuccess: (d) => {
      toast({ title: "Loan Offer Created", description: d.message });
      qc.invalidateQueries({ queryKey: ["loan-offers"] });
      setShowRequestForm(false);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const acceptLoan = useMutation({
    mutationFn: (id: string) =>
      authFetch(`/api/finance/loan-offers/${id}/accept`, { method: "POST" }).then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed");
        return d;
      }),
    onSuccess: (d) => {
      toast({ title: "Loan Accepted!", description: d.message });
      qc.invalidateQueries({ queryKey: ["loan-offers"] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const declineLoan = useMutation({
    mutationFn: (id: string) =>
      authFetch(`/api/finance/loan-offers/${id}/decline`, { method: "POST" }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Offer declined" });
      qc.invalidateQueries({ queryKey: ["loan-offers"] });
    },
  });

  if (!user) {
    return (
      <Layout><div className="py-24 text-center text-muted-foreground">Please log in to access financial services.</div></Layout>
    );
  }

  const loanTypeLabels: Record<string, string> = {
    working_capital: "Working Capital Loan",
    mobilization_advance: "Mobilization Advance",
    payroll_bridge: "Payroll Bridge",
    fuel_advance: "Fuel Advance",
    invoice_advance: "Invoice Advance",
  };

  const statusColors: Record<string, string> = {
    offered: "bg-blue-100 text-blue-800",
    accepted: "bg-green-100 text-green-800",
    declined: "bg-gray-100 text-gray-600",
    disbursed: "bg-purple-100 text-purple-800",
    repaid: "bg-green-100 text-green-800",
    defaulted: "bg-red-100 text-red-800",
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <IndianRupee className="h-6 w-6 text-primary" />
              Embedded Finance
            </h1>
            <p className="text-muted-foreground text-sm mt-1">WhatsApp Pay · UPI One World · Working Capital Loans</p>
          </div>
          <Badge variant="outline" className="text-xs">{user.role}</Badge>
        </div>

        {/* OmniCredit Score — providers only */}
        {isProvider && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                OmniCredit Score
              </CardTitle>
              <CardDescription>Your creditworthiness based on platform activity</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingElig ? (
                <div className="h-24 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className={`text-5xl font-bold ${creditScoreColor(eligibility?.creditScore ?? 0)}`}>
                        {eligibility?.creditScore ?? "—"}
                      </div>
                      <div className={`text-sm font-medium ${creditScoreColor(eligibility?.creditScore ?? 0)}`}>
                        {creditScoreLabel(eligibility?.creditScore ?? 0)}
                      </div>
                      <div className="text-xs text-muted-foreground">out of 900</div>
                    </div>
                    <div className="flex-1 space-y-2">
                      <Progress value={((eligibility?.creditScore ?? 300) - 300) / 6} className="h-3" />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>300</span><span>550 (min)</span><span>750</span><span>900</span>
                      </div>
                    </div>
                  </div>

                  {eligibility?.signals && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Completed Jobs", value: eligibility.signals.completedPayments },
                        { label: "Completion Rate", value: `${eligibility.signals.completionRate}%` },
                        { label: "Dispute Rate", value: `${eligibility.signals.disputeRate}%` },
                        { label: "OmniScore", value: eligibility.signals.omniScore },
                      ].map(s => (
                        <div key={s.label} className="bg-muted/40 rounded-lg p-3 text-center">
                          <div className="text-lg font-semibold">{s.value}</div>
                          <div className="text-xs text-muted-foreground">{s.label}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {eligibility?.eligible ? (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-700 font-medium mb-1">
                        <CheckCircle2 className="h-4 w-4" />
                        You qualify for a loan up to {fmt(eligibility.maxPrincipal)}
                      </div>
                      <div className="text-sm text-green-600">
                        Rate: {eligibility.interestRate}% p.a. · Tenure: {eligibility.tenureDays} days · Type: {loanTypeLabels[eligibility.loanType] ?? eligibility.loanType}
                      </div>
                      {!showRequestForm && (
                        <Button size="sm" className="mt-3" onClick={() => setShowRequestForm(true)}>
                          <Wallet className="h-4 w-4 mr-1" />
                          Request Loan
                        </Button>
                      )}
                      {showRequestForm && (
                        <div className="mt-3 flex items-end gap-3">
                          <div className="flex-1">
                            <Label className="text-xs">Requested Amount (₹)</Label>
                            <Input
                              type="number"
                              min={1000}
                              max={eligibility.maxPrincipal}
                              value={requestAmount}
                              onChange={e => setRequestAmount(Number(e.target.value))}
                              className="mt-1"
                            />
                          </div>
                          <Button size="sm" onClick={() => requestLoan.mutate(requestAmount)} disabled={requestLoan.isPending}>
                            {requestLoan.isPending ? "Processing..." : "Submit"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setShowRequestForm(false)}>Cancel</Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-orange-700 font-medium mb-1">
                        <AlertTriangle className="h-4 w-4" />
                        Not eligible yet
                      </div>
                      <p className="text-sm text-orange-600">{eligibility?.reason}</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Loan Offers History */}
        {isProvider && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Loan History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingOffers ? (
                <div className="text-sm text-muted-foreground py-4 text-center">Loading...</div>
              ) : !offers?.length ? (
                <div className="text-sm text-muted-foreground py-6 text-center">No loan offers yet. Build your OmniCredit score by completing jobs.</div>
              ) : (
                <div className="space-y-3">
                  {offers.map((o: Record<string, unknown>) => (
                    <div key={o.id as string} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium text-sm">{loanTypeLabels[o.loanType as string] ?? o.loanType as string}</div>
                        <div className="text-xs text-muted-foreground">{fmt(o.principalAmount as number)} · {o.interestRate as number}% p.a. · {o.tenureDays as number} days</div>
                        <div className="text-xs text-muted-foreground">{new Date(o.createdAt as string).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[o.status as string] ?? ""}`}>{o.status as string}</span>
                        {o.status === "offered" && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => acceptLoan.mutate(o.id as string)} disabled={acceptLoan.isPending}>Accept</Button>
                            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => declineLoan.mutate(o.id as string)}>Decline</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* WhatsApp Pay */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-green-600" />
              WhatsApp Pay
            </CardTitle>
            <CardDescription>Pay directly from WhatsApp for eligible low-risk jobs</CardDescription>
          </CardHeader>
          <CardContent>
            {whatsappElig ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {whatsappElig.eligible
                    ? <><CheckCircle2 className="h-4 w-4 text-green-600" /><span className="text-sm text-green-700 font-medium">Enabled — up to {fmt(whatsappElig.maxTransactionAmount)}</span></>
                    : <><XCircle className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">{whatsappElig.reason}</span></>
                  }
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="font-medium">Eligibility conditions:</p>
                  {(whatsappElig.conditions as string[]).map((c: string) => <p key={c} className="flex items-center gap-1"><span className="text-muted-foreground">·</span>{c}</p>)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Supported categories: {(whatsappElig.supportedCategories as string[]).join(", ")}
                </div>
              </div>
            ) : <div className="text-sm text-muted-foreground">Loading...</div>}
          </CardContent>
        </Card>

        {/* UPI One World */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-600" />
              UPI One World
            </CardTitle>
            <CardDescription>International payments for delegates and NRIs without a local bank account</CardDescription>
          </CardHeader>
          <CardContent>
            {upiOneWorld ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {upiOneWorld.eligible
                    ? <><CheckCircle2 className="h-4 w-4 text-green-600" /><span className="text-sm text-green-700 font-medium">Enabled — up to {fmt(upiOneWorld.maxTransactionAmount)}</span></>
                    : <><XCircle className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Complete KYC to enable</span></>
                  }
                </div>
                <p className="text-xs text-muted-foreground">{upiOneWorld.message}</p>
                <div className="text-xs text-muted-foreground">
                  Supported categories: {(upiOneWorld.supportedCategories as string[]).join(", ")} · Fallback: {upiOneWorld.fallback}
                </div>
              </div>
            ) : <div className="text-sm text-muted-foreground">Loading...</div>}
          </CardContent>
        </Card>

        {/* Enterprise invoice finance placeholder */}
        {user.role === "enterprise_buyer" && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-600" />
                Invoice Finance
                <Badge variant="outline" className="text-xs ml-1">Coming Soon</Badge>
              </CardTitle>
              <CardDescription>Finance your supplier invoices — fund work before receiving your own payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <p>Invoice financing for enterprise buyers allows you to advance payments to qualified vendors while your own accounts receivable are pending. Coming in the next release.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Fraud shield status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-600" />
              Account Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{user.isVerified ? "✓" : "!"}</div>
                <div className="text-xs text-muted-foreground">KYC Status</div>
              </div>
              <div className="flex-1 space-y-1 text-sm">
                <p className="flex items-center gap-2">
                  {user.isVerified ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <AlertTriangle className="h-4 w-4 text-orange-500" />}
                  {user.isVerified ? "Identity verified" : "Identity not yet verified"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Verified accounts get higher loan limits, lower interest rates, and faster payout processing.
                </p>
              </div>
              {!user.isVerified && (
                <Button size="sm" variant="outline" onClick={() => setLocation("/compliance")}>
                  Verify Now
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
