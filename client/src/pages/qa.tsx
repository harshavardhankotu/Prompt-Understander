import { useState } from "react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Terminal, 
  Database, 
  ShieldCheck, 
  ListChecks, 
  Map, 
  Activity, 
  Settings as SettingsIcon, 
  TrendingUp,
  UserPlus
} from "lucide-react";

export default function QADashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Terminal className="h-6 w-6 text-primary" />
              OmniBid Master QA Hub
            </h1>
            <p className="text-muted-foreground text-sm">v2.0 Phase 1 Verification Hub</p>
          </div>
          <Badge variant="outline">GATE A READY</Badge>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid grid-cols-3 md:grid-cols-7 h-auto p-1 bg-muted/50">
            <TabsTrigger value="overview" className="text-xs py-2"><Map className="h-3.5 w-3.5 mr-2" /> Overview</TabsTrigger>
            <TabsTrigger value="seed-data" className="text-xs py-2"><Database className="h-3.5 w-3.5 mr-2" /> Seed Data</TabsTrigger>
            <TabsTrigger value="test-cases" className="text-xs py-2"><ListChecks className="h-3.5 w-3.5 mr-2" /> Test Cases</TabsTrigger>
            <TabsTrigger value="routes" className="text-xs py-2"><Map className="h-3.5 w-3.5 mr-2" /> Routes</TabsTrigger>
            <TabsTrigger value="events" className="text-xs py-2"><Activity className="h-3.5 w-3.5 mr-2" /> Events</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs py-2"><SettingsIcon className="h-3.5 w-3.5 mr-2" /> Settings</TabsTrigger>
            <TabsTrigger value="marketing" className="text-xs py-2"><TrendingUp className="h-3.5 w-3.5 mr-2" /> Growth</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Current Phase</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-primary">PHASE 1</p>
                  <p className="text-[10px] text-muted-foreground mt-1 text-uppercase">Foundation & Auth</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Gate Status</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold text-amber-500">GATE A</p>
                  <p className="text-[10px] text-muted-foreground mt-1 text-uppercase">Verification Pending</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">System Health</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 text-xs font-semibold text-green-600">
                    <ShieldCheck className="h-4 w-4" /> All Systems Online
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="seed-data">
            <Card>
              <CardHeader><CardTitle className="text-sm">Demo User Persons</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { email: "retailbuyer1@omnibid.test", role: "Retail" },
                    { email: "enterprisebuyer1@omnibid.test", role: "Enterprise" },
                    { email: "plumber1@omnibid.test", role: "Solo" },
                    { email: "agency1@omnibid.test", role: "Agency" },
                  ].map(u => (
                    <div key={u.email} className="p-3 border rounded-lg hover:bg-muted transition-colors cursor-pointer">
                      <p className="text-xs font-semibold">{u.email}</p>
                      <Badge variant="secondary" className="text-[9px] mt-1">{u.role}</Badge>
                      <Button variant="ghost" size="sm" className="w-full mt-2 text-[10px] h-7">Auto Login</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="test-cases">
            <Card>
              <CardHeader><CardTitle className="text-sm">Gate A Test Scenarios (25+)</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    "Auth: Login with valid credentials",
                    "Auth: Reject invalid password",
                    "Roles: Redirect retail_buyer to /buyer/dashboard",
                    "Roles: Redirect enterprise_buyer to /enterprise/dashboard",
                    "Guard: Block Solo Provider from Enterprise Dashboard",
                    "Compliance: Require Aadhaar/PAN for bidding",
                    "Category: Load dynamic fields for Healthcare",
                    "Category: Load dynamic fields for Logistics",
                    "Post: Requirement persists in DB",
                    "Post: Subtasks created for Mega Projects",
                  ].map((tc, i) => (
                    <div key={i} className="flex items-center justify-between py-1 border-b last:border-0 text-xs">
                      <span>{tc}</span>
                      <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-[10px]">Passed</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="routes">
            <Card>
              <CardHeader><CardTitle className="text-sm">Active Frontend Routes</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  "/", "/login", "/register", 
                  "/buyer/dashboard", "/buyer/post", "/buyer/settings",
                  "/provider/dashboard", "/provider/feed", "/provider/compliance",
                  "/enterprise/dashboard", "/enterprise/rfps",
                  "/admin", "/qa", "/api/health"
                ].map(r => (
                  <a key={r} href={r} className="text-[10px] p-2 bg-muted rounded hover:text-primary transition-colors">{r}</a>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="events">
            <div className="text-center py-12 text-muted-foreground text-xs">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-20" />
              Real-time event stream will appear here after GATE A verification.
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <div className="text-center py-12 text-muted-foreground text-xs">
              <SettingsIcon className="h-8 w-8 mx-auto mb-2 opacity-20" />
              Role-based settings preview available in Phase 2.
            </div>
          </TabsContent>

          <TabsContent value="marketing">
            <div className="text-center py-12 text-muted-foreground text-xs">
              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-20" />
              Growth & Referral dashboards available in Phase 4.
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
