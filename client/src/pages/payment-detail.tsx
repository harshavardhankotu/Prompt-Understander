import { useState } from "react";
import { useParams, useLocation } from "wouter";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  useGetPayment,
  getGetPaymentQueryKey,
  useCreatePayment,
  useSubmitWorkProof,
  useApproveMilestone,
  useGetRequirement,
  getGetRequirementQueryKey,
} from "@omnibid/api-client-react";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, CheckCircle2, Clock, IndianRupee, Lock, Receipt, Shield, Upload, XCircle,
} from "lucide-react";

export default function PaymentDetail() {
  const { requirementId } = useParams<{ requirementId: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [upiId, setUpiId] = useState("");
  const [mobPct, setMobPct] = useState(0);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [showProofDialog, setShowProofDialog] = useState(false);
  const [proofNotes, setProofNotes] = useState("");
  const [milestoneTitle, setMilestoneTitle] = useState("Work completion");
  const [milestoneNum, setMilestoneNum] = useState(1);

  const { data: req } = useGetRequirement(requirementId, {
    query: { queryKey: getGetRequirementQueryKey(requirementId), enabled: !!requirementId },
  });

  const { data, isLoading, refetch } = useGetPayment(requirementId, {
    query: { queryKey: getGetPaymentQueryKey(requirementId), enabled: !!requirementId },
  });

  const createPayment = useCreatePayment();
  const submitProof = useSubmitWorkProof();
  const approveMilestone = useApproveMilestone();

  const payment = data?.payment;
  const workProofs = data?.workProofs ?? [];
  const isBuyer = user?.id === req?.buyerId;
  const isProvider = req?.winningBidId && !isBuyer;

  const winningBidId = req?.winningBidId;

  const handlePay = () => {
    if (!winningBidId) return;
    createPayment.mutate(
      {
        requirementId,
        data: {
          bidId: winningBidId,
          mobilizationAdvancePct: mobPct,
          upiId: upiId || undefined,
          totalMilestones: 1,
        },
      },
      {
        onSuccess: () => {
          setShowPayDialog(false);
          refetch();
          toast({ title: "Payment initiated!", description: "Funds are held in escrow. Release on milestone approval." });
        },
        onError: () => toast({ title: "Payment failed", variant: "destructive" }),
      }
    );
  };

  const handleSubmitProof = () => {
    if (!proofNotes.trim()) return;
    submitProof.mutate(
      {
        requirementId,
        data: { milestoneNumber: milestoneNum, milestoneTitle, notes: proofNotes },
      },
      {
        onSuccess: () => {
          setShowProofDialog(false);
          setProofNotes("");
          qc.invalidateQueries({ queryKey: getGetPaymentQueryKey(requirementId) });
          toast({ title: "Work proof submitted!", description: "Waiting for buyer approval." });
        },
        onError: () => toast({ title: "Failed to submit proof", variant: "destructive" }),
      }
    );
  };

  const handleApprove = (proofId: string, approved: boolean) => {
    approveMilestone.mutate(
      {
        requirementId,
        data: { workProofId: proofId, approved },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetPaymentQueryKey(requirementId) });
          toast({
            title: approved ? "Milestone approved! Payment released." : "Milestone rejected.",
            description: approved ? "The provider has been notified and funds released." : "Provider can resubmit.",
          });
        },
        onError: () => toast({ title: "Failed", variant: "destructive" }),
      }
    );
  };

  const escrowStatusColor: Record<string, string> = {
    pending: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    held: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    released: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    disputed: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    refunded: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation(`/requirements/${requirementId}`)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-lg font-bold">UPI Escrow Payment</h1>
            {req && <p className="text-xs text-muted-foreground">{req.title}</p>}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-48 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        ) : !payment ? (
          /* No payment yet — show initiation UI for buyer */
          isBuyer && winningBidId ? (
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-primary" />
                  Initiate UPI Escrow Payment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-400">
                  <Shield className="h-4 w-4 inline mr-1.5" />
                  Funds are held securely in escrow and released only when you approve the provider's work.
                </div>

                <div>
                  <Label htmlFor="upi-id">Your UPI ID (optional)</Label>
                  <Input
                    id="upi-id"
                    className="mt-1.5"
                    placeholder="yourname@upi or 9876543210@paytm"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Mobilization Advance</Label>
                  <p className="text-xs text-muted-foreground mb-2">Release a portion upfront to help the provider get started.</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 10, 20, 30].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setMobPct(pct)}
                        className={`py-2 rounded-lg border text-sm font-medium transition-all ${mobPct === pct ? "border-primary bg-primary/5 text-primary" : "border-border"}`}
                      >
                        {pct === 0 ? "None" : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full font-semibold"
                  onClick={() => setShowPayDialog(true)}
                >
                  <IndianRupee className="h-4 w-4 mr-1.5" />
                  Pay & Lock in Escrow
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-16 text-muted-foreground">
              <Lock className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Payment not initiated yet. Waiting for buyer.</p>
            </div>
          )
        ) : (
          /* Payment exists — show escrow dashboard */
          <>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Escrow Status</CardTitle>
                  <Badge className={`text-xs capitalize ${escrowStatusColor[payment.escrowStatus] ?? ""}`}>
                    {payment.escrowStatus.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 rounded-lg bg-muted/50">
                    <div className="text-xs text-muted-foreground">Total Amount</div>
                    <div className="font-bold text-lg flex items-center gap-0.5">
                      <IndianRupee className="h-3.5 w-3.5" />
                      {payment.totalAmount.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20">
                    <div className="text-xs text-muted-foreground">Provider Receives</div>
                    <div className="font-bold text-lg text-green-700 dark:text-green-400 flex items-center gap-0.5">
                      <IndianRupee className="h-3.5 w-3.5" />
                      {payment.netToProvider.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Platform fee ({payment.platformFeePercent}%)</span>
                    <span>-₹{payment.platformFeeAmount.toLocaleString("en-IN")}</span>
                  </div>
                  {payment.tdsAmount > 0 && (
                    <div className="flex justify-between">
                      <span>TDS deducted (2% — above ₹30,000)</span>
                      <span>-₹{payment.tdsAmount.toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {payment.mobilizationAdvancePct > 0 && (
                    <div className="flex justify-between font-medium text-blue-600 dark:text-blue-400">
                      <span>Mobilization advance ({payment.mobilizationAdvancePct}%) — {payment.advanceReleased ? "Released" : "Pending"}</span>
                      <span>₹{Math.round(payment.netToProvider * payment.mobilizationAdvancePct / 100).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-green-600 dark:text-green-400 font-medium pt-1 border-t">
                    <span>UPI Transaction ID</span>
                    <span className="font-mono">{payment.upiTransactionId}</span>
                  </div>
                </div>

                {/* Milestones progress */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium">Milestones</span>
                    <span className="text-muted-foreground">{payment.milestonesCompleted}/{payment.totalMilestones} approved</span>
                  </div>
                  <Progress value={(payment.milestonesCompleted / payment.totalMilestones) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Work Proofs */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Receipt className="h-4 w-4" />
                    Work Proofs & Milestones
                  </CardTitle>
                  {isProvider && payment.escrowStatus !== "released" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={() => setShowProofDialog(true)}
                    >
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      Submit Proof
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {workProofs.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No work proofs submitted yet.
                    {isProvider && " Submit your first milestone proof above."}
                  </p>
                )}
                {workProofs.map((proof) => (
                  <div
                    key={proof.id}
                    className={`rounded-xl border p-3 ${proof.buyerApproved ? "border-green-300 bg-green-50 dark:bg-green-950/10" : "border-border"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold">Milestone {proof.milestoneNumber}: {proof.milestoneTitle}</span>
                          {proof.buyerApproved ? (
                            <Badge className="text-[10px] bg-green-500 text-white px-1.5">
                              <CheckCircle2 className="h-2.5 w-2.5 mr-0.5 inline" />Approved
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] px-1.5">Pending Review</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3 inline mr-0.5" />
                          {new Date(proof.submittedAt).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm mt-2 text-foreground/80">{proof.notes}</p>
                    {proof.buyerNote && (
                      <p className="text-xs mt-1.5 text-muted-foreground bg-muted/50 rounded-lg p-2">
                        Buyer note: {proof.buyerNote}
                      </p>
                    )}

                    {isBuyer && !proof.buyerApproved && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(proof.id, true)}
                          disabled={approveMilestone.isPending}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                          Approve & Release Payment
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => handleApprove(proof.id, false)}
                          disabled={approveMilestone.isPending}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1.5" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Pay confirmation dialog */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-primary" />
              Confirm UPI Escrow Payment
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="p-3 rounded-xl bg-muted/60 space-y-2">
              <div className="flex items-center justify-center gap-2 text-3xl font-bold py-2">
                {/* Mock QR */}
                <div className="w-24 h-24 bg-muted border-2 border-dashed border-border rounded-lg flex items-center justify-center text-xs text-muted-foreground text-center p-2">
                  Scan QR<br/>to Pay
                </div>
              </div>
              <p className="text-center text-muted-foreground text-xs">or pay to UPI ID: <span className="font-mono font-medium">omnibid@icici</span></p>
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Amount held in escrow</span>
                <span className="font-semibold">₹{req && req.winningBidId ? "—" : "—"}</span>
              </div>
              <div className="flex justify-between text-green-600">
                <span>This is a mock payment</span>
                <span>✓ Simulated</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>Cancel</Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={handlePay}
              disabled={createPayment.isPending}
            >
              <IndianRupee className="h-4 w-4 mr-1.5" />
              {createPayment.isPending ? "Processing..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit proof dialog */}
      <Dialog open={showProofDialog} onOpenChange={setShowProofDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Submit Work Proof
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <Label htmlFor="milestone-title">Milestone title</Label>
              <Input
                id="milestone-title"
                className="mt-1.5"
                value={milestoneTitle}
                onChange={(e) => setMilestoneTitle(e.target.value)}
                placeholder="e.g. Foundation work complete"
              />
            </div>
            <div>
              <Label htmlFor="proof-notes">Work notes</Label>
              <Textarea
                id="proof-notes"
                className="mt-1.5"
                rows={4}
                value={proofNotes}
                onChange={(e) => setProofNotes(e.target.value)}
                placeholder="Describe the work completed, materials used, hours spent..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProofDialog(false)}>Cancel</Button>
            <Button
              onClick={handleSubmitProof}
              disabled={!proofNotes.trim() || submitProof.isPending}
            >
              {submitProof.isPending ? "Submitting..." : "Submit for Approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
