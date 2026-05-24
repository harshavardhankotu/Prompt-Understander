import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ShieldCheck,
  ShieldAlert,
  FileText,
  Building2,
  UserCheck,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from "lucide-react";

const schema = z.object({
  panNumber: z.string().optional(),
  gstNumber: z.string().optional(),
  mcaRegistration: z.string().optional(),
  insuranceUploadUrl: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ComplianceVault {
  id: string;
  userId: string;
  aadhaarStatus: string;
  panNumber: string | null;
  gstNumber: string | null;
  mcaRegistration: string | null;
  insuranceUploadUrl: string | null;
  isEmpanelled: boolean;
  createdAt: string;
  updatedAt: string;
}

const ROLE_LABELS: Record<string, { label: string; description: string; color: string }> = {
  retail_buyer: { label: "Retail Buyer", description: "B2C — Posts standard jobs", color: "bg-blue-100 text-blue-700" },
  enterprise_buyer: { label: "Enterprise Buyer", description: "B2B — Posts RFPs & manages vendor lists", color: "bg-purple-100 text-purple-700" },
  solo_provider: { label: "Solo Provider", description: "Worker — Bids on jobs, KYC required", color: "bg-green-100 text-green-700" },
  agency_provider: { label: "Agency Provider", description: "Fleet Manager — Manages team & large contracts", color: "bg-orange-100 text-orange-700" },
  buyer: { label: "Buyer", description: "Posts requirements", color: "bg-blue-100 text-blue-700" },
  provider: { label: "Provider", description: "Bids on requirements", color: "bg-green-100 text-green-700" },
  both: { label: "Buyer & Provider", description: "Posts and bids", color: "bg-gray-100 text-gray-700" },
};

export default function Compliance() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);

  const isProviderRole = user?.role === "solo_provider" || user?.role === "agency_provider" || user?.role === "provider" || user?.role === "both";
  const isEnterpriseRole = user?.role === "enterprise_buyer" || user?.role === "agency_provider";
  const isAgency = user?.role === "agency_provider";

  const { data: vault, isLoading } = useQuery<ComplianceVault | null>({
    queryKey: ["compliance"],
    queryFn: async () => {
      const token = localStorage.getItem("omnibid_token");
      const res = await fetch("/api/compliance/my", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!user,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    values: {
      panNumber: vault?.panNumber ?? "",
      gstNumber: vault?.gstNumber ?? "",
      mcaRegistration: vault?.mcaRegistration ?? "",
      insuranceUploadUrl: vault?.insuranceUploadUrl ?? "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const token = localStorage.getItem("omnibid_token");
      const res = await fetch("/api/compliance/my", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to save" }));
        throw new Error(err.error ?? "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["compliance"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast({ title: "Compliance vault saved!", description: "Your details have been securely stored." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (!user) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <ShieldAlert className="h-10 w-10 mb-3" />
          <p>Please login to view your compliance vault.</p>
        </div>
      </Layout>
    );
  }

  const roleInfo = ROLE_LABELS[user.role] ?? ROLE_LABELS["buyer"];
  const gstFilled = !!(vault?.gstNumber);
  const panFilled = !!(vault?.panNumber);
  const complianceComplete = isEnterpriseRole ? gstFilled : (isProviderRole ? panFilled : true);

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Compliance Vault
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Securely store your KYC, GST, and compliance documents. Required for posting or bidding.
          </p>
        </div>

        {/* Account Type Card */}
        <Card>
          <CardContent className="p-4 flex items-start gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-sm">{user.name}</span>
                <Badge className={`text-[10px] ${roleInfo.color}`}>{roleInfo.label}</Badge>
                {vault?.isEmpanelled && (
                  <Badge className="text-[10px] bg-amber-100 text-amber-700">Empanelled</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{roleInfo.description}</p>
            </div>
            <div className="text-right">
              {complianceComplete ? (
                <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                  <CheckCircle2 className="h-4 w-4" /> Compliant
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                  <AlertTriangle className="h-4 w-4" /> Incomplete
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Grid */}
        <div className="grid grid-cols-3 gap-3">
          {[
            {
              label: "Aadhaar KYC",
              value: vault?.aadhaarStatus ?? "pending",
              icon: UserCheck,
              show: isProviderRole,
              color: vault?.aadhaarStatus === "verified" ? "text-green-600" : "text-amber-600",
              bg: vault?.aadhaarStatus === "verified" ? "bg-green-50" : "bg-amber-50",
            },
            {
              label: "PAN Number",
              value: panFilled ? "Saved" : "Missing",
              icon: FileText,
              show: true,
              color: panFilled ? "text-green-600" : "text-muted-foreground",
              bg: panFilled ? "bg-green-50" : "bg-muted/40",
            },
            {
              label: "GST Number",
              value: gstFilled ? "Saved" : isEnterpriseRole ? "Required" : "Optional",
              icon: Building2,
              show: true,
              color: gstFilled ? "text-green-600" : isEnterpriseRole ? "text-red-600" : "text-muted-foreground",
              bg: gstFilled ? "bg-green-50" : isEnterpriseRole ? "bg-red-50" : "bg-muted/40",
            },
          ]
            .filter((s) => s.show)
            .map((s) => {
              const Icon = s.icon;
              return (
                <Card key={s.label} className={`${s.bg} border-0`}>
                  <CardContent className="p-3 text-center">
                    <Icon className={`h-5 w-5 mx-auto mb-1 ${s.color}`} />
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    <p className={`text-xs font-semibold mt-0.5 capitalize ${s.color}`}>{s.value}</p>
                  </CardContent>
                </Card>
              );
            })}
        </div>

        {/* GST Warning */}
        {isEnterpriseRole && !gstFilled && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <p>
              <strong>Action required:</strong> GST Number is mandatory for {roleInfo.label} accounts before you can post requirements or place bids.
            </p>
          </div>
        )}

        {/* Details Form */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Your Compliance Details</CardTitle>
            <CardDescription className="text-xs">Stored securely. Not visible to other users.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
                  <FormField control={form.control} name="panNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        PAN Number
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="ABCDE1234F" {...field} data-testid="input-pan" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="gstNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        GST Number
                        {isEnterpriseRole && <span className="text-destructive">*</span>}
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="27ABCDE1234F1Z5" {...field} data-testid="input-gst" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  {isAgency && (
                    <FormField control={form.control} name="mcaRegistration" render={({ field }) => (
                      <FormItem>
                        <FormLabel>MCA Registration Number</FormLabel>
                        <FormControl>
                          <Input placeholder="U12345MH2020PTC123456" {...field} data-testid="input-mca" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  {isProviderRole && (
                    <FormField control={form.control} name="insuranceUploadUrl" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Insurance Certificate URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://drive.google.com/…" {...field} data-testid="input-insurance" />
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">Paste a public link to your professional liability / PI insurance document.</p>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}

                  <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-save-compliance">
                    {mutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : saved ? (
                      <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 mr-2" />
                    )}
                    {saved ? "Saved!" : "Save Compliance Details"}
                  </Button>

                  {isProviderRole && (
                    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                      <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <p>Aadhaar verification is done manually by the OmniBid team within 24 hours of document submission.</p>
                    </div>
                  )}
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
