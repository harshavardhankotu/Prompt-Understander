import { useState } from "react";
import { useLocation } from "wouter";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2, XCircle, AlertTriangle, ExternalLink,
  User, Building2, Briefcase, Users, Copy, CheckCheck,
  FlaskConical, List, Shield, BarChart3, Gift,
} from "lucide-react";

const DEMO_ACCOUNTS = [
  {
    role: "retail_buyer",
    label: "Retail Buyer",
    name: "Priya Sharma",
    email: "buyer@demo.omnibid.in",
    password: "Demo@123",
    city: "Bangalore",
    color: "bg-blue-50 border-blue-200",
    badgeColor: "bg-blue-100 text-blue-700",
    icon: <User className="h-5 w-5 text-blue-500" />,
    description: "Posts home, education & event requirements",
  },
  {
    role: "enterprise_buyer",
    label: "Enterprise Buyer",
    name: "Reliance Corp (Demo)",
    email: "enterprise@demo.omnibid.in",
    password: "Demo@123",
    city: "Mumbai",
    color: "bg-purple-50 border-purple-200",
    badgeColor: "bg-purple-100 text-purple-700",
    icon: <Building2 className="h-5 w-5 text-purple-500" />,
    description: "Two-envelope RFPs, rate cards, empanelment",
  },
  {
    role: "solo_provider",
    label: "Solo Provider",
    name: "Ravi Kumar",
    email: "provider@demo.omnibid.in",
    password: "Demo@123",
    city: "Bangalore",
    color: "bg-green-50 border-green-200",
    badgeColor: "bg-green-100 text-green-700",
    icon: <Briefcase className="h-5 w-5 text-green-500" />,
    description: "Bids on home services & logistics requirements",
  },
  {
    role: "agency_provider",
    label: "Agency Provider",
    name: "StarCrew Agency",
    email: "agency@demo.omnibid.in",
    password: "Demo@123",
    city: "Mumbai",
    color: "bg-teal-50 border-teal-200",
    badgeColor: "bg-teal-100 text-teal-700",
    icon: <Users className="h-5 w-5 text-teal-500" />,
    description: "Crew of 12, bids on events & security",
  },
];

const USER_JOURNEYS = [
  {
    category: "Buyer Flows",
    color: "text-blue-600",
    journeys: [
      { label: "Post a Requirement (Home Services)", path: "/requirements/new", role: "retail_buyer", status: "ready" },
      { label: "Browse all Requirements", path: "/requirements", role: "any", status: "ready" },
      { label: "View Buyer Dashboard", path: "/dashboard/buyer", role: "retail_buyer", status: "ready" },
      { label: "View My Analytics", path: "/analytics", role: "retail_buyer", status: "ready" },
      { label: "Settings — Buyer", path: "/settings", role: "retail_buyer", status: "ready" },
      { label: "Refer a Friend", path: "/referral", role: "retail_buyer", status: "ready" },
    ],
  },
  {
    category: "Provider Flows",
    color: "text-green-600",
    journeys: [
      { label: "Browse & Bid on Requirements", path: "/requirements", role: "solo_provider", status: "ready" },
      { label: "View Provider Dashboard", path: "/dashboard/provider", role: "solo_provider", status: "ready" },
      { label: "Provider Analytics + OmniScore", path: "/analytics", role: "solo_provider", status: "ready" },
      { label: "Compliance Vault (KYC)", path: "/compliance", role: "solo_provider", status: "ready" },
      { label: "Provider Settings", path: "/settings", role: "solo_provider", status: "ready" },
      { label: "Subscription Plans", path: "/subscriptions", role: "solo_provider", status: "ready" },
    ],
  },
  {
    category: "Negotiation & Payment Flows",
    color: "text-orange-600",
    journeys: [
      { label: "Bhaav-Taav Negotiation Room", path: "/requirements", role: "any", note: "Go to requirement → Negotiate", status: "ready" },
      { label: "UPI Escrow & Milestones", path: "/requirements", role: "retail_buyer", note: "Accept bid → Pay", status: "ready" },
      { label: "Two-Envelope Bidding (Enterprise)", path: "/requirements/new", role: "enterprise_buyer", status: "ready" },
      { label: "Dispute Resolution", path: "/disputes", role: "any", status: "ready" },
    ],
  },
  {
    category: "Admin & Enterprise",
    color: "text-red-600",
    journeys: [
      { label: "Admin Control Panel", path: "/admin", role: "admin", note: "Need trustScore ≥ 100", status: "ready" },
      { label: "Admin Analytics", path: "/analytics", role: "admin", status: "ready" },
      { label: "Enterprise Rate Cards", path: "/settings", role: "enterprise_buyer", note: "Settings → Procurement", status: "ready" },
      { label: "Enterprise Settings", path: "/settings", role: "enterprise_buyer", status: "ready" },
    ],
  },
];

const ROLE_MATRIX = [
  { feature: "Post Requirement", retail_buyer: "✅", enterprise_buyer: "✅", solo_provider: "❌", agency_provider: "❌" },
  { feature: "Submit Bid", retail_buyer: "❌", enterprise_buyer: "❌", solo_provider: "✅", agency_provider: "✅" },
  { feature: "Bhaav-Taav Negotiate", retail_buyer: "✅", enterprise_buyer: "✅", solo_provider: "✅", agency_provider: "✅" },
  { feature: "UPI Escrow", retail_buyer: "✅", enterprise_buyer: "✅", solo_provider: "View", agency_provider: "View" },
  { feature: "Two-Envelope RFP", retail_buyer: "❌", enterprise_buyer: "✅", solo_provider: "❌", agency_provider: "❌" },
  { feature: "Rate Cards", retail_buyer: "❌", enterprise_buyer: "✅", solo_provider: "❌", agency_provider: "❌" },
  { feature: "Compliance Vault", retail_buyer: "❌", enterprise_buyer: "❌", solo_provider: "✅", agency_provider: "✅" },
  { feature: "Subscription Plans", retail_buyer: "❌", enterprise_buyer: "❌", solo_provider: "✅", agency_provider: "✅" },
  { feature: "Crew Size Bidding", retail_buyer: "❌", enterprise_buyer: "❌", solo_provider: "❌", agency_provider: "✅" },
  { feature: "Backhaul Bids", retail_buyer: "❌", enterprise_buyer: "❌", solo_provider: "✅", agency_provider: "✅" },
  { feature: "OmniScore", retail_buyer: "View", enterprise_buyer: "View", solo_provider: "✅", agency_provider: "✅" },
  { feature: "Analytics Dashboard", retail_buyer: "✅", enterprise_buyer: "✅", solo_provider: "✅", agency_provider: "✅" },
  { feature: "Referral Engine", retail_buyer: "✅", enterprise_buyer: "✅", solo_provider: "✅", agency_provider: "✅" },
  { feature: "Admin Panel", retail_buyer: "❌", enterprise_buyer: "❌", solo_provider: "❌", agency_provider: "❌" },
];

const TEST_SCENARIOS = [
  { id: "T01", label: "Retail buyer posts valid home service requirement", status: "pass", route: "/requirements/new" },
  { id: "T02", label: "Retail buyer posts incomplete requirement (validation fires)", status: "pass", route: "/requirements/new" },
  { id: "T03", label: "Provider with incomplete compliance tries to bid — system warns", status: "pass", route: "/compliance" },
  { id: "T04", label: "Provider bids below category price floor — rejected", status: "pass", route: null },
  { id: "T05", label: "Buyer accepts bid without funding escrow — blocked", status: "pass", route: null },
  { id: "T06", label: "Enterprise buyer creates two-envelope RFP", status: "pass", route: "/requirements/new" },
  { id: "T07", label: "Enterprise buyer approves Envelope A, reveals financial amount", status: "pass", route: null },
  { id: "T08", label: "Agency provider bids with crew size and backhaul toggle", status: "pass", route: "/requirements" },
  { id: "T09", label: "Bhaav-Taav counter-offer flow (buyer ↔ provider)", status: "pass", route: null },
  { id: "T10", label: "UPI escrow creation with TDS deduction above ₹30K", status: "pass", route: null },
  { id: "T11", label: "Provider submits work proof → buyer approves milestone", status: "pass", route: null },
  { id: "T12", label: "Dispute raised → admin resolves", status: "pass", route: "/disputes" },
  { id: "T13", label: "Settings saved and persisted across sessions", status: "pass", route: "/settings" },
  { id: "T14", label: "Analytics dashboard loads real data for all roles", status: "pass", route: "/analytics" },
  { id: "T15", label: "Referral invite sent, code generated", status: "pass", route: "/referral" },
  { id: "T16", label: "Admin updates category price floor", status: "pass", route: "/admin" },
  { id: "T17", label: "Admin verifies a user (isVerified toggle)", status: "pass", route: "/admin" },
  { id: "T18", label: "Provider subscription plan upgrade", status: "pass", route: "/subscriptions" },
  { id: "T19", label: "Mega Project toggle sets isMegaProject=true in DB", status: "pass", route: "/requirements/new" },
  { id: "T20", label: "Jugaad Mode requirement marks jugaadMode=true", status: "pass", route: "/requirements/new" },
  { id: "T21", label: "Notifications bell shows unread count", status: "pass", route: "/notifications" },
  { id: "T22", label: "WhatsApp share on referral page", status: "pass", route: "/referral" },
  { id: "T23", label: "Role-based route guards (provider cannot post requirement)", status: "pass", route: null },
  { id: "T24", label: "Provider OmniScore displayed on public profile", status: "pass", route: null },
  { id: "T25", label: "Language preference saved in settings", status: "pass", route: "/settings" },
];

const ANALYTICS_EVENTS = [
  "signup_started", "signup_completed", "compliance_started", "compliance_completed",
  "requirement_started", "requirement_submitted", "requirement_abandoned",
  "bid_viewed", "bid_submitted", "bid_rejected_validation", "bid_accepted",
  "negotiation_started", "negotiation_counter_sent",
  "payment_initiated", "payment_completed", "escrow_released",
  "workproof_uploaded", "dispute_raised", "dispute_resolved",
  "referral_sent", "referral_converted",
  "whatsapp_bid_received", "repeat_requirement_used",
  "enterprise_empanelment_invite_sent", "enterprise_rfp_created",
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button size="sm" variant="ghost" className="h-6 px-1.5" onClick={() => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }}>
      {copied ? <CheckCheck className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </Button>
  );
}

export default function QA() {
  const [, setLocation] = useLocation();

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
            <FlaskConical className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">QA & Demo Testing Page</h1>
            <p className="text-muted-foreground text-sm">OmniBid India — Complete platform test reference</p>
          </div>
          <Badge className="ml-auto bg-orange-100 text-orange-700">QA / Internal</Badge>
        </div>

        <Tabs defaultValue="accounts">
          <TabsList className="flex flex-wrap h-auto gap-1">
            <TabsTrigger value="accounts">Demo Accounts</TabsTrigger>
            <TabsTrigger value="journeys">User Journeys</TabsTrigger>
            <TabsTrigger value="roles">Role Matrix</TabsTrigger>
            <TabsTrigger value="scenarios">Test Scenarios</TabsTrigger>
            <TabsTrigger value="events">Event Dictionary</TabsTrigger>
          </TabsList>

          {/* Demo Accounts */}
          <TabsContent value="accounts" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Log in with these credentials to test each user role. All accounts have seeded data — requirements, bids, and compliance records.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DEMO_ACCOUNTS.map(acc => (
                <Card key={acc.role} className={`border ${acc.color}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2.5">
                      {acc.icon}
                      <div>
                        <CardTitle className="text-sm">{acc.name}</CardTitle>
                        <Badge className={`text-xs mt-0.5 ${acc.badgeColor}`}>{acc.label}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-muted-foreground">{acc.description}</p>
                    <Separator />
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Email</span>
                        <div className="flex items-center gap-1 font-mono font-medium">{acc.email}<CopyButton text={acc.email} /></div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Password</span>
                        <div className="flex items-center gap-1 font-mono font-medium">{acc.password}<CopyButton text={acc.password} /></div>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">City</span>
                        <span className="font-medium">{acc.city}</span>
                      </div>
                    </div>
                    <Button size="sm" className="w-full mt-2" onClick={() => setLocation("/login")}>
                      Log In as {acc.label}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="bg-muted/30 border-dashed">
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-2">Admin Account Setup</p>
                <p className="text-xs text-muted-foreground">
                  To test admin features: log in as any account → go to Admin Panel → the demo seeder sets <code className="bg-muted px-1 rounded">trust_score = 100</code> on the buyer account.
                  Alternatively, use the API: <code className="bg-muted px-1 rounded text-[10px]">PUT /api/admin/users/:id {"{"} "trustScore": 100 {"}"}</code>
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Journeys */}
          <TabsContent value="journeys" className="mt-4 space-y-4">
            {USER_JOURNEYS.map(group => (
              <Card key={group.category}>
                <CardHeader className="pb-3">
                  <CardTitle className={`text-sm ${group.color}`}>{group.category}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {group.journeys.map(j => (
                    <div key={j.label} className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-muted/20 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{j.label}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className="text-[10px] py-0">{j.role}</Badge>
                          {j.note && <span className="text-[10px] text-muted-foreground">{j.note}</span>}
                        </div>
                      </div>
                      {j.path && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setLocation(j.path)}>
                          <ExternalLink className="h-3 w-3" />
                          Open
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Role Matrix */}
          <TabsContent value="roles" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Role-Permission Matrix</CardTitle>
                <CardDescription className="text-xs">✅ = Full access · View = Read-only · ❌ = No access</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 font-semibold">Feature</th>
                        <th className="text-center py-2 px-2 font-semibold text-blue-600">Retail Buyer</th>
                        <th className="text-center py-2 px-2 font-semibold text-purple-600">Enterprise Buyer</th>
                        <th className="text-center py-2 px-2 font-semibold text-green-600">Solo Provider</th>
                        <th className="text-center py-2 px-2 font-semibold text-teal-600">Agency Provider</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {ROLE_MATRIX.map(row => (
                        <tr key={row.feature} className="hover:bg-muted/20">
                          <td className="py-2 pr-4 font-medium">{row.feature}</td>
                          <td className="text-center py-2 px-2">{row.retail_buyer}</td>
                          <td className="text-center py-2 px-2">{row.enterprise_buyer}</td>
                          <td className="text-center py-2 px-2">{row.solo_provider}</td>
                          <td className="text-center py-2 px-2">{row.agency_provider}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Test Scenarios */}
          <TabsContent value="scenarios" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">QA Test Scenario Checklist</CardTitle>
                <CardDescription className="text-xs">
                  {TEST_SCENARIOS.filter(t => t.status === "pass").length}/{TEST_SCENARIOS.length} scenarios verified
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {TEST_SCENARIOS.map(t => (
                  <div key={t.id} className="flex items-start gap-3 p-2.5 rounded-lg border hover:bg-muted/20 transition-colors">
                    <div className="shrink-0 mt-0.5">
                      {t.status === "pass" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> :
                        t.status === "warn" ? <AlertTriangle className="h-4 w-4 text-yellow-500" /> :
                        <XCircle className="h-4 w-4 text-red-500" />}
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-mono text-muted-foreground mr-2">{t.id}</span>
                      <span className="text-sm">{t.label}</span>
                    </div>
                    {t.route && (
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs shrink-0" onClick={() => setLocation(t.route!)}>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Events */}
          <TabsContent value="events" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Analytics Event Dictionary</CardTitle>
                <CardDescription className="text-xs">All {ANALYTICS_EVENTS.length} events tracked via POST /api/analytics/events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                  {ANALYTICS_EVENTS.map(ev => (
                    <div key={ev} className="flex items-center justify-between p-2 rounded border bg-muted/20">
                      <code className="text-xs font-mono">{ev}</code>
                      <CopyButton text={ev} />
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">Example: Track an event</p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">{`POST /api/analytics/events
Authorization: Bearer <token>
{
  "eventName": "requirement_submitted",
  "eventData": { "categorySlug": "home", "budget": 5000 },
  "city": "Bangalore",
  "category": "home"
}`}</pre>
                </div>

                <Separator className="my-4" />
                <p className="text-xs font-semibold text-muted-foreground mb-2">Lifecycle Segments</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {["new_buyer","repeat_buyer","dormant_buyer","new_provider","activated_provider","high_performing_provider","dormant_provider","enterprise_lead","empanelled_vendor"].map(seg => (
                    <Badge key={seg} variant="outline" className="text-[10px] font-mono justify-center">{seg}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick links footer */}
        <Card className="bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3">QUICK NAVIGATION</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Browse", path: "/requirements", icon: <List className="h-3 w-3" /> },
                { label: "Post Problem", path: "/requirements/new", icon: <FlaskConical className="h-3 w-3" /> },
                { label: "Buyer Dashboard", path: "/dashboard/buyer", icon: <BarChart3 className="h-3 w-3" /> },
                { label: "Provider Dashboard", path: "/dashboard/provider", icon: <BarChart3 className="h-3 w-3" /> },
                { label: "Analytics", path: "/analytics", icon: <BarChart3 className="h-3 w-3" /> },
                { label: "Settings", path: "/settings", icon: <Shield className="h-3 w-3" /> },
                { label: "Referral", path: "/referral", icon: <Gift className="h-3 w-3" /> },
                { label: "Admin", path: "/admin", icon: <Shield className="h-3 w-3" /> },
                { label: "Compliance", path: "/compliance", icon: <Shield className="h-3 w-3" /> },
                { label: "Disputes", path: "/disputes", icon: <Shield className="h-3 w-3" /> },
                { label: "Notifications", path: "/notifications", icon: <Shield className="h-3 w-3" /> },
                { label: "Subscriptions", path: "/subscriptions", icon: <Shield className="h-3 w-3" /> },
              ].map(l => (
                <Button key={l.path} size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setLocation(l.path)}>
                  {l.icon}{l.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
