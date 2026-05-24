import { useState, useRef, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  useGetNegotiation,
  getGetNegotiationQueryKey,
  useSendNegotiationMessage,
  useRespondToCounterOffer,
  useGetRequirement,
  getGetRequirementQueryKey,
} from "@omnibid/api-client-react";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle2, Clock, IndianRupee, MessageSquare, Send, XCircle } from "lucide-react";

export default function Negotiate() {
  const { requirementId, providerId } = useParams<{ requirementId: string; providerId: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [text, setText] = useState("");
  const [showCounterDialog, setShowCounterDialog] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");

  const { data: req } = useGetRequirement(requirementId, {
    query: { queryKey: getGetRequirementQueryKey(requirementId), enabled: !!requirementId },
  });

  const isBuyer = user?.id === req?.buyerId;

  const { data: neg, isLoading } = useGetNegotiation(
    requirementId,
    { providerId: isBuyer ? providerId : undefined },
    {
      query: {
        queryKey: getGetNegotiationQueryKey(requirementId, { providerId: isBuyer ? providerId : undefined }),
        enabled: !!requirementId && !!user,
        refetchInterval: 5000,
      },
    }
  );

  const sendMsg = useSendNegotiationMessage();
  const respondOffer = useRespondToCounterOffer();

  const messages = Array.isArray(neg?.messages) ? neg.messages as Array<{
    id: string; senderId: string; senderRole: string; text: string;
    isCounterOffer?: boolean; counterAmount?: number | null; sentAt: string; isSystem?: boolean;
  }> : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = () => {
    if (!text.trim()) return;
    sendMsg.mutate(
      {
        requirementId,
        data: { text: text.trim(), providerId: isBuyer ? providerId : undefined },
      },
      {
        onSuccess: () => {
          setText("");
          qc.invalidateQueries({ queryKey: getGetNegotiationQueryKey(requirementId, { providerId: isBuyer ? providerId : undefined }) });
        },
        onError: () => toast({ title: "Failed to send", variant: "destructive" }),
      }
    );
  };

  const handleCounterOffer = () => {
    const amount = Number(counterAmount);
    if (!amount || amount <= 0) return;
    sendMsg.mutate(
      {
        requirementId,
        data: {
          text: `Counter-offer: ₹${amount.toLocaleString("en-IN")}`,
          isCounterOffer: true,
          counterAmount: amount,
          providerId: isBuyer ? providerId : undefined,
        },
      },
      {
        onSuccess: () => {
          setShowCounterDialog(false);
          setCounterAmount("");
          qc.invalidateQueries({ queryKey: getGetNegotiationQueryKey(requirementId, { providerId: isBuyer ? providerId : undefined }) });
          toast({ title: "Counter-offer sent!", description: "Waiting for the provider's response." });
        },
        onError: () => toast({ title: "Failed to send counter-offer", variant: "destructive" }),
      }
    );
  };

  const handleRespond = (action: "accept" | "decline") => {
    respondOffer.mutate(
      { requirementId, data: { action } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetNegotiationQueryKey(requirementId, { providerId: isBuyer ? providerId : undefined }) });
          toast({
            title: action === "accept" ? "Counter-offer accepted!" : "Counter-offer declined.",
            description: action === "accept" ? "The buyer has been notified. Finalize your deal." : "The buyer will be notified.",
          });
        },
        onError: () => toast({ title: "Failed to respond", variant: "destructive" }),
      }
    );
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation(`/requirements/${requirementId}`)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Requirement
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  Bhaav-Taav Negotiation Room
                </CardTitle>
                {req && (
                  <p className="text-xs text-muted-foreground mt-0.5">For: {req.title}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {neg && (
                  <Badge variant="outline" className="text-xs">
                    {neg.buyerName} ↔ {neg.providerName}
                  </Badge>
                )}
                {neg?.counterOfferStatus === "pending" && (
                  <Badge className="text-xs bg-amber-500 text-white animate-pulse">
                    Counter-offer pending
                  </Badge>
                )}
                {neg?.counterOfferStatus === "accepted" && (
                  <Badge className="text-xs bg-green-500 text-white">
                    <CheckCircle2 className="h-3 w-3 mr-1 inline" />
                    Deal agreed!
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="h-[400px] overflow-y-auto p-4 space-y-3 bg-muted/20">
              {isLoading && (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
                </div>
              )}

              {messages.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">No messages yet. Start the negotiation!</p>
                  <p className="text-xs mt-1 opacity-70">Only the buyer may send a counter-offer (once per negotiation).</p>
                </div>
              )}

              {messages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                const isSystem = msg.isSystem;

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <span className={`text-xs px-3 py-1.5 rounded-full font-medium ${
                        msg.text.includes("accepted") ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}>
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                      isMe
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-card border rounded-tl-sm"
                    } ${msg.isCounterOffer ? "border-2 border-amber-400" : ""}`}>
                      {msg.isCounterOffer && (
                        <div className="flex items-center gap-1 text-xs font-semibold mb-1 text-amber-600">
                          <IndianRupee className="h-3 w-3" />
                          Counter-offer: ₹{Number(msg.counterAmount).toLocaleString("en-IN")}
                        </div>
                      )}
                      <p className="text-sm leading-relaxed">{msg.text}</p>
                      <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        <Clock className="h-2.5 w-2.5 inline mr-0.5" />
                        {new Date(msg.sentAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Provider: Accept/Decline counter-offer if pending */}
            {!isBuyer && neg?.counterOfferStatus === "pending" && neg.counterOfferAmount && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border-t border-amber-200 dark:border-amber-800">
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-3 text-center">
                  Buyer's counter-offer: ₹{Number(neg.counterOfferAmount).toLocaleString("en-IN")}
                </p>
                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    size="sm"
                    onClick={() => handleRespond("accept")}
                    disabled={respondOffer.isPending}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Accept this Price
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                    size="sm"
                    onClick={() => handleRespond("decline")}
                    disabled={respondOffer.isPending}
                  >
                    <XCircle className="h-4 w-4 mr-1.5" />
                    Decline
                  </Button>
                </div>
              </div>
            )}

            {/* Message input */}
            {neg?.counterOfferStatus !== "accepted" && (
              <div className="p-4 border-t space-y-2">
                <div className="flex gap-2">
                  <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Type your message..."
                    rows={2}
                    className="resize-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />
                  <Button
                    onClick={handleSend}
                    disabled={!text.trim() || sendMsg.isPending}
                    size="sm"
                    className="self-end"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>

                {isBuyer && neg?.counterOfferStatus === "none" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                    onClick={() => setShowCounterDialog(true)}
                  >
                    <IndianRupee className="h-3.5 w-3.5 mr-1.5" />
                    Make Final Counter-Offer
                  </Button>
                )}
                {isBuyer && neg?.counterOfferStatus !== "none" && (
                  <p className="text-xs text-center text-muted-foreground">
                    Counter-offer {neg?.counterOfferStatus === "pending" ? "is pending response" : `was ${neg?.counterOfferStatus}`}.
                    Only one counter-offer is allowed per negotiation.
                  </p>
                )}
              </div>
            )}

            {neg?.counterOfferStatus === "accepted" && (
              <div className="p-4 border-t bg-green-50 dark:bg-green-950/20 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-green-700">
                  Deal agreed at ₹{Number(neg.counterOfferAmount).toLocaleString("en-IN")}!
                </p>
                <p className="text-xs text-muted-foreground mt-1 mb-3">Proceed to accept the bid and initiate payment.</p>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => setLocation(`/requirements/${requirementId}`)}
                >
                  Back to Accept Bid & Pay
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Counter-offer dialog */}
      <Dialog open={showCounterDialog} onOpenChange={setShowCounterDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-amber-500" />
              Make Final Counter-Offer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              You can only make ONE counter-offer per negotiation. The provider will see this amount and can Accept or Decline. If 15 minutes pass with no response, the lowest bid wins.
            </p>
            <div>
              <Label htmlFor="counter-amount">Your counter-offer (₹)</Label>
              <div className="relative mt-1.5">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="counter-amount"
                  type="number"
                  className="pl-8"
                  placeholder="e.g. 45000"
                  value={counterAmount}
                  onChange={(e) => setCounterAmount(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCounterDialog(false)}>Cancel</Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleCounterOffer}
              disabled={!counterAmount || Number(counterAmount) <= 0 || sendMsg.isPending}
            >
              Send Counter-Offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
