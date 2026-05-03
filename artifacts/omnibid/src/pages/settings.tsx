import { useState, useEffect, useCallback } from "react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell, User, Lock, CreditCard, Briefcase, Building2,
  MapPin, MessageSquare, Sliders, Shield, ChevronRight,
  Save, RotateCcw, Loader2,
} from "lucide-react";

const TOKEN_KEY = "omnibid_token";

function authFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  return fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
}

type SettingObj = Record<string, unknown>;

const SECTIONS_BY_ROLE: Record<string, { key: string; label: string; icon: React.ReactNode }[]> = {
  retail_buyer: [
    { key: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    { key: "preferences", label: "Preferences", icon: <Sliders className="h-4 w-4" /> },
    { key: "payment", label: "Payment", icon: <CreditCard className="h-4 w-4" /> },
    { key: "privacy", label: "Privacy", icon: <Lock className="h-4 w-4" /> },
    { key: "recurring", label: "Recurring", icon: <RotateCcw className="h-4 w-4" /> },
  ],
  enterprise_buyer: [
    { key: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    { key: "company", label: "Company", icon: <Building2 className="h-4 w-4" /> },
    { key: "procurement", label: "Procurement", icon: <Briefcase className="h-4 w-4" /> },
    { key: "empanelment", label: "Empanelment", icon: <Shield className="h-4 w-4" /> },
    { key: "analytics", label: "Analytics Access", icon: <Sliders className="h-4 w-4" /> },
    { key: "payment", label: "Payment / Tax", icon: <CreditCard className="h-4 w-4" /> },
  ],
  solo_provider: [
    { key: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    { key: "bidding", label: "Bidding Preferences", icon: <Sliders className="h-4 w-4" /> },
    { key: "availability", label: "Availability", icon: <User className="h-4 w-4" /> },
    { key: "payout", label: "Payout", icon: <CreditCard className="h-4 w-4" /> },
    { key: "profile", label: "Profile Visibility", icon: <Lock className="h-4 w-4" /> },
    { key: "compliance", label: "Compliance", icon: <Shield className="h-4 w-4" /> },
    { key: "referral", label: "Referral", icon: <MessageSquare className="h-4 w-4" /> },
  ],
  agency_provider: [
    { key: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    { key: "bidding", label: "Bidding Preferences", icon: <Sliders className="h-4 w-4" /> },
    { key: "availability", label: "Availability & Crew", icon: <User className="h-4 w-4" /> },
    { key: "payout", label: "Payout & GST", icon: <CreditCard className="h-4 w-4" /> },
    { key: "profile", label: "Profile Visibility", icon: <Lock className="h-4 w-4" /> },
    { key: "compliance", label: "Compliance", icon: <Shield className="h-4 w-4" /> },
    { key: "referral", label: "Referral", icon: <MessageSquare className="h-4 w-4" /> },
  ],
  buyer: [
    { key: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    { key: "preferences", label: "Preferences", icon: <Sliders className="h-4 w-4" /> },
    { key: "privacy", label: "Privacy", icon: <Lock className="h-4 w-4" /> },
  ],
  provider: [
    { key: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    { key: "bidding", label: "Bidding", icon: <Sliders className="h-4 w-4" /> },
    { key: "availability", label: "Availability", icon: <User className="h-4 w-4" /> },
  ],
  both: [
    { key: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" /> },
    { key: "preferences", label: "Preferences", icon: <Sliders className="h-4 w-4" /> },
    { key: "bidding", label: "Bidding", icon: <Sliders className="h-4 w-4" /> },
  ],
};

function ToggleField({ label, description, value, onChange }: { label: string; description?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

function TextField({ label, description, value, onChange, placeholder, type = "text" }: { label: string; description?: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="space-y-1.5 py-2">
      <Label className="text-sm font-medium">{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <Input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="max-w-sm" />
    </div>
  );
}

function NumberField({ label, description, value, onChange, min, max }: { label: string; description?: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <div className="space-y-1.5 py-2">
      <Label className="text-sm font-medium">{label}</Label>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      <Input type="number" value={value} min={min} max={max} onChange={e => onChange(Number(e.target.value))} className="max-w-[160px]" />
    </div>
  );
}

function renderSection(sectionKey: string, data: SettingObj, onChange: (key: string, val: unknown) => void) {
  const get = (k: string, def: unknown = "") => (k in data ? data[k] : def);

  const boolField = (k: string, label: string, desc?: string) => (
    <ToggleField key={k} label={label} description={desc} value={Boolean(get(k, false))} onChange={v => onChange(k, v)} />
  );
  const strField = (k: string, label: string, placeholder?: string, desc?: string) => (
    <TextField key={k} label={label} description={desc} value={String(get(k, ""))} onChange={v => onChange(k, v)} placeholder={placeholder} />
  );
  const numField = (k: string, label: string, desc?: string, min?: number, max?: number) => (
    <NumberField key={k} label={label} description={desc} value={Number(get(k, 0))} onChange={v => onChange(k, v)} min={min} max={max} />
  );

  switch (sectionKey) {
    case "notifications":
      return (
        <div className="divide-y">
          {("newBidEmail" in data) && boolField("newBidEmail", "New bid received — Email")}
          {("newBidSMS" in data) && boolField("newBidSMS", "New bid received — SMS")}
          {("newBidWhatsApp" in data) && boolField("newBidWhatsApp", "New bid received — WhatsApp")}
          {("bidAcceptedEmail" in data) && boolField("bidAcceptedEmail", "Bid accepted — Email")}
          {("requirementExpiredEmail" in data) && boolField("requirementExpiredEmail", "Requirement expired — Email")}
          {("disputeUpdateEmail" in data) && boolField("disputeUpdateEmail", "Dispute updates — Email")}
          {("negotiationUpdateEmail" in data) && boolField("negotiationUpdateEmail", "Negotiation update — Email")}
          {("paymentReceivedEmail" in data) && boolField("paymentReceivedEmail", "Payment received — Email")}
          {("newRequirementEmail" in data) && boolField("newRequirementEmail", "New requirement alert — Email")}
          {("newRequirementSMS" in data) && boolField("newRequirementSMS", "New requirement alert — SMS")}
          {("newRequirementWhatsApp" in data) && boolField("newRequirementWhatsApp", "New requirement alert — WhatsApp")}
          {("rfpActivityEmail" in data) && boolField("rfpActivityEmail", "RFP activity — Email")}
          {("vendorResponseEmail" in data) && boolField("vendorResponseEmail", "Vendor response — Email")}
          {("invoiceReadyEmail" in data) && boolField("invoiceReadyEmail", "Invoice ready — Email")}
          {("crewAlertEmail" in data) && boolField("crewAlertEmail", "Crew alert — Email")}
        </div>
      );

    case "preferences":
      return (
        <div className="space-y-1 divide-y">
          {strField("defaultCity", "Default City", "e.g. Bangalore")}
          {strField("defaultState", "Default State", "e.g. Karnataka")}
          <div className="py-2 space-y-1.5">
            <Label className="text-sm font-medium">Language</Label>
            <Select value={String(get("language", "en"))} onValueChange={v => onChange("language", v)}>
              <SelectTrigger className="max-w-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="hi">हिंदी</SelectItem>
                <SelectItem value="ta">தமிழ்</SelectItem>
                <SelectItem value="te">తెలుగు</SelectItem>
                <SelectItem value="kn">ಕನ್ನಡ</SelectItem>
                <SelectItem value="mr">मराठी</SelectItem>
                <SelectItem value="gu">ગુજરાતી</SelectItem>
                <SelectItem value="bn">বাংলা</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {boolField("autoInvitePreviousProvider", "Auto-invite previous provider", "When reposting, automatically invite the provider from last time")}
          {boolField("contactSyncPermission", "Jaan-Pehchaan Mode", "Allow contact sync to find providers you already know")}
        </div>
      );

    case "payment":
      return (
        <div className="space-y-1 divide-y">
          {strField("defaultUpiId", "Default UPI ID", "yourname@upi")}
          {("defaultGstNumber" in data) && strField("defaultGstNumber", "GST Number", "22AAAAA0000A1Z5")}
          {("defaultBillingEmail" in data) && strField("defaultBillingEmail", "Billing Email")}
          {("autoEscrowRelease" in data) && boolField("autoEscrowRelease", "Auto-release escrow after work proof approved")}
          {("tdsEnabled" in data) && boolField("tdsEnabled", "Enable TDS deduction on payouts (2% above ₹30K)")}
          <div className="py-2 space-y-1.5">
            <Label className="text-sm font-medium">Preferred Payment Method</Label>
            <Select value={String(get("preferredPaymentMethod", "upi"))} onValueChange={v => onChange("preferredPaymentMethod", v)}>
              <SelectTrigger className="max-w-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="neft">NEFT / Bank Transfer</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );

    case "privacy":
      return (
        <div className="divide-y">
          {boolField("showContactToBidders", "Show phone number to bidders")}
          {boolField("showProfileToProviders", "Show profile publicly to providers")}
          {("allowAnonymousBrowsing" in data) && boolField("allowAnonymousBrowsing", "Browse requirements without showing my name")}
        </div>
      );

    case "recurring":
      return (
        <div className="space-y-1 divide-y">
          {numField("defaultDeadlineHours", "Default auction deadline (hours)", "How many hours before bids close", 1, 720)}
          {boolField("autoRepostOnExpiry", "Auto-repost requirement when it expires")}
        </div>
      );

    case "company":
      return (
        <div className="space-y-1 divide-y">
          {strField("gstNumber", "GST Number", "22AAAAA0000A1Z5")}
          {strField("panNumber", "PAN Number", "AAAAA0000A")}
          {strField("cinNumber", "CIN Number (if applicable)", "U12345MH2020PTC000000")}
          {strField("authorizedSignatory", "Authorized Signatory Name")}
          {strField("billingEmail", "Billing Email")}
        </div>
      );

    case "procurement":
      return (
        <div className="divide-y">
          {boolField("twoEnvelopeByDefault", "Use Two-Envelope bidding by default", "Separates technical and financial bids")}
          {boolField("rateCeilingEnabled", "Enforce rate card ceilings on bids")}
          {boolField("approvalRequired", "Require internal approval before accepting bids")}
          {boolField("privateRfpByDefault", "Make RFPs private (invite-only) by default")}
        </div>
      );

    case "empanelment":
      return (
        <div className="space-y-1 divide-y">
          {boolField("autoInviteEmpanelled", "Auto-invite empanelled vendors for new RFPs")}
          {numField("minVendorRating", "Minimum vendor rating to receive invites", undefined, 1, 5)}
          {numField("minVendorOmniScore", "Minimum OmniScore to receive invites", undefined, 0, 1000)}
        </div>
      );

    case "analytics":
      return (
        <div className="divide-y">
          <div className="py-2 space-y-1.5">
            <Label className="text-sm font-medium">Analytics Access Level</Label>
            <Select value={String(get("accessLevel", "full"))} onValueChange={v => onChange("accessLevel", v)}>
              <SelectTrigger className="max-w-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Access</SelectItem>
                <SelectItem value="summary">Summary Only</SelectItem>
                <SelectItem value="none">Restricted</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {boolField("exportEnabled", "Allow analytics data export")}
        </div>
      );

    case "bidding":
      return (
        <div className="space-y-1 divide-y">
          {boolField("autoBidSuggestions", "Show auto-bid price suggestions")}
          {numField("bidAlertMinBudget", "Alert only for requirements above budget (₹)", undefined, 0)}
          {boolField("whatsAppBiddingEnabled", "Enable WhatsApp bidding", "Receive and respond to bid alerts via WhatsApp")}
          {("maxCrewDeployable" in data) && numField("maxCrewDeployable", "Max crew deployable per project", undefined, 1)}
        </div>
      );

    case "availability":
      return (
        <div className="space-y-1 divide-y">
          {boolField("isAvailable", "Currently available for new projects")}
          {strField("benchAvailableFrom", "Bench/crew available from (date)", "YYYY-MM-DD")}
          {("maxConcurrentProjects" in data) && numField("maxConcurrentProjects", "Max concurrent projects", undefined, 1, 50)}
          {("totalCrewSize" in data) && numField("totalCrewSize", "Total crew size", undefined, 1)}
        </div>
      );

    case "payout":
      return (
        <div className="space-y-1 divide-y">
          {strField("defaultUpiId", "Default UPI ID", "yourname@upi")}
          {("defaultBankAccount" in data) && strField("defaultBankAccount", "Bank Account (IFSC:ACC)", "SBIN0000001:00011234567890")}
          {("gstNumber" in data) && strField("gstNumber", "GST Number", "22AAAAA0000A1Z5")}
          {numField("autoWithdrawThreshold", "Auto-withdraw when balance exceeds (₹)", undefined, 0)}
        </div>
      );

    case "profile":
      return (
        <div className="divide-y">
          {boolField("publicProfileVisible", "Show public provider profile")}
          {boolField("showRates", "Show rate range on public profile")}
          {("showCrewSize" in data) && boolField("showCrewSize", "Show crew size on public profile")}
        </div>
      );

    case "compliance":
      return (
        <div className="divide-y">
          {boolField("autoRenewKyc", "Auto-remind for KYC renewal")}
          {numField("reminderDaysBefore", "Remind me ___ days before expiry", undefined, 1, 90)}
          {("gstMandatory" in data) && boolField("gstMandatory", "Require GST on all bids above ₹20L")}
        </div>
      );

    case "referral":
      return (
        <div className="divide-y">
          {boolField("shareOnBidWin", "Auto-share my referral link when I win a bid")}
        </div>
      );

    default:
      return <p className="text-sm text-muted-foreground py-4">No settings available for this section.</p>;
  }
}

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SettingObj>({});
  const [role, setRole] = useState<string>("retail_buyer");
  const [activeSection, setActiveSection] = useState<string>("");
  const [dirty, setDirty] = useState(false);

  const sections = SECTIONS_BY_ROLE[role] ?? SECTIONS_BY_ROLE["retail_buyer"];

  const loadSettings = useCallback(async () => {
    try {
      const res = await authFetch("/settings/my");
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setSettings(data.settings as SettingObj);
      setRole(data.role);
      setActiveSection(sec => sec || (SECTIONS_BY_ROLE[data.role]?.[0]?.key ?? "notifications"));
    } catch {
      toast({ title: "Could not load settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) loadSettings();
  }, [user, loadSettings]);

  const sectionData: SettingObj = (activeSection && typeof settings[activeSection] === "object" && settings[activeSection] !== null)
    ? (settings[activeSection] as SettingObj)
    : {};

  function handleChange(key: string, val: unknown) {
    setSettings(prev => ({
      ...prev,
      [activeSection]: { ...(prev[activeSection] as SettingObj ?? {}), [key]: val },
    }));
    setDirty(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await authFetch("/settings/my", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error("Failed to save");
      setDirty(false);
      toast({ title: "Settings saved!" });
    } catch {
      toast({ title: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-16 text-muted-foreground">Please log in to access settings.</div>
      </Layout>
    );
  }

  const ROLE_LABELS: Record<string, string> = {
    retail_buyer: "Retail Buyer",
    enterprise_buyer: "Enterprise Buyer",
    solo_provider: "Solo Provider",
    agency_provider: "Agency Provider",
    buyer: "Buyer",
    provider: "Provider",
    both: "Buyer & Provider",
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your preferences for your <Badge variant="secondary" className="text-xs">{ROLE_LABELS[role] ?? role}</Badge> account
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Sidebar */}
          <aside className="md:col-span-1">
            <Card>
              <CardContent className="p-2">
                <nav className="space-y-0.5">
                  {sections.map(sec => (
                    <button
                      key={sec.key}
                      onClick={() => setActiveSection(sec.key)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm transition-colors text-left ${activeSection === sec.key ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"}`}
                    >
                      {sec.icon}
                      <span>{sec.label}</span>
                      {activeSection !== sec.key && <ChevronRight className="h-3 w-3 ml-auto opacity-50" />}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Main content */}
          <div className="md:col-span-3 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {sections.find(s => s.key === activeSection)?.label ?? "Settings"}
                    </CardTitle>
                    <CardDescription className="text-xs mt-0.5">
                      Changes are saved per section
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={!dirty || saving}
                  >
                    {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Save className="h-3 w-3 mr-1" />}
                    Save
                  </Button>
                </div>
              </CardHeader>
              <Separator />
              <CardContent className="pt-4">
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-3/4" />
                  </div>
                ) : (
                  renderSection(activeSection, sectionData, handleChange)
                )}
              </CardContent>
            </Card>

            {/* Account danger zone */}
            <Card className="border-destructive/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Deactivate Account</p>
                    <p className="text-xs text-muted-foreground">Temporarily hide your profile and pause notifications</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                    Deactivate
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Delete Account</p>
                    <p className="text-xs text-muted-foreground">Permanently delete all data — this cannot be undone</p>
                  </div>
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10">
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
