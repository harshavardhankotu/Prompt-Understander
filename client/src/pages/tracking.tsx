import { useState } from "react";
import Layout from "@/components/layout";
import { useAuth } from "@/lib/auth";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Navigation, Clock, Leaf, CheckCircle2, Truck, User,
  Shield, AlertTriangle, BarChart3,
} from "lucide-react";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
function authFetch(path: string, opts: RequestInit = {}) {
  const token = localStorage.getItem("omnibid_token");
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opts.headers },
  });
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  en_route: { label: "En Route", color: "bg-blue-100 text-blue-700", icon: Navigation },
  on_site: { label: "On Site", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  completed: { label: "Completed", color: "bg-gray-100 text-gray-600", icon: CheckCircle2 },
};

const sustainabilityColors: Record<string, string> = {
  eco_winner: "text-green-600 bg-green-50 border-green-200",
  local_match: "text-emerald-600 bg-emerald-50 border-emerald-200",
  regional: "text-yellow-600 bg-yellow-50 border-yellow-200",
  national: "text-orange-600 bg-orange-50 border-orange-200",
};

export default function TrackingPage() {
  const { requirementId } = useParams<{ requirementId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [lat, setLat] = useState("12.9716");
  const [lng, setLng] = useState("77.5946");
  const [gpsStatus, setGpsStatus] = useState<"en_route" | "on_site" | "completed">("en_route");
  const [eta, setEta] = useState("30");
  const [showSustainabilityForm, setShowSustainabilityForm] = useState(false);
  const [provLat, setProvLat] = useState("12.9716");
  const [provLng, setProvLng] = useState("77.5946");
  const [reqLat, setReqLat] = useState("13.0827");
  const [reqLng, setReqLng] = useState("80.2707");

  const isProvider = ["provider", "both", "solo_provider", "agency_provider"].includes(user?.role ?? "");
  const isEnterprise = user?.role === "enterprise_buyer";

  const { data: tracking, isLoading: loadTracking } = useQuery({
    queryKey: ["tracking-gps", requirementId],
    queryFn: () => authFetch(`/api/tracking/gps/${requirementId}`).then(r => r.json()),
    enabled: !!user && !!requirementId,
    refetchInterval: 15000,
  });

  const { data: sustainability, isLoading: loadSustain } = useQuery({
    queryKey: ["tracking-sustainability", requirementId],
    queryFn: () => authFetch(`/api/market/sustainability/${requirementId}`).then(r => r.json()),
    enabled: !!user && !!requirementId,
  });

  const postGps = useMutation({
    mutationFn: () =>
      authFetch("/api/tracking/gps", {
        method: "POST",
        body: JSON.stringify({
          requirementId,
          latitude: Number(lat),
          longitude: Number(lng),
          status: gpsStatus,
          etaMinutes: Number(eta),
          speedKmh: 25,
          accuracyMeters: 10,
        }),
      }).then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed");
        return d;
      }),
    onSuccess: (d) => {
      toast({ title: "Location Updated", description: d.message });
      qc.invalidateQueries({ queryKey: ["tracking-gps", requirementId] });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const stopSharing = useMutation({
    mutationFn: () =>
      authFetch("/api/tracking/gps/stop", { method: "POST", body: JSON.stringify({ requirementId }) }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Location sharing stopped" });
      qc.invalidateQueries({ queryKey: ["tracking-gps", requirementId] });
    },
  });

  const computeSustainability = useMutation({
    mutationFn: () =>
      authFetch("/api/tracking/sustainability", {
        method: "POST",
        body: JSON.stringify({
          requirementId,
          providerLat: Number(provLat),
          providerLon: Number(provLng),
          requirementLat: Number(reqLat),
          requirementLon: Number(reqLng),
        }),
      }).then(async r => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed");
        return d;
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tracking-sustainability", requirementId] });
      setShowSustainabilityForm(false);
      toast({ title: "Sustainability computed" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (!user) {
    return <Layout><div className="py-24 text-center text-muted-foreground">Please log in to view tracking.</div></Layout>;
  }

  if (!requirementId) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12 text-center">
          <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-xl font-bold mb-2">GPS Tracking</h1>
          <p className="text-muted-foreground text-sm">Open this page from a specific requirement to view or share tracking.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MapPin className="h-6 w-6 text-primary" />
              GPS Tracking
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Real-time location and ETA for this job</p>
          </div>
          <Badge variant="outline" className="text-xs">{user.role}</Badge>
        </div>

        {/* Provider: Share location */}
        {isProvider && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Navigation className="h-4 w-4 text-blue-600" />
                Share Your Location
              </CardTitle>
              <CardDescription>Let the buyer know you're on your way</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Latitude</Label>
                  <Input value={lat} onChange={e => setLat(e.target.value)} className="mt-1 font-mono text-sm" />
                </div>
                <div>
                  <Label className="text-xs">Longitude</Label>
                  <Input value={lng} onChange={e => setLng(e.target.value)} className="mt-1 font-mono text-sm" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={gpsStatus} onValueChange={(v) => setGpsStatus(v as typeof gpsStatus)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en_route">En Route</SelectItem>
                      <SelectItem value="on_site">On Site (Arrived)</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">ETA (minutes)</Label>
                  <Input type="number" value={eta} onChange={e => setEta(e.target.value)} className="mt-1" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => postGps.mutate()} disabled={postGps.isPending} className="flex-1">
                  <Navigation className="h-4 w-4 mr-1" />
                  {postGps.isPending ? "Updating..." : "Update Location"}
                </Button>
                <Button variant="outline" onClick={() => stopSharing.mutate()} disabled={stopSharing.isPending}>
                  <Shield className="h-4 w-4 mr-1" />
                  Stop Sharing
                </Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Location is only shared with the buyer for the duration of this active booking.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tracking Feed — buyers and providers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="h-4 w-4" />
              Live Tracking Feed
              {!loadTracking && tracking?.providers?.length > 0 && (
                <Badge className="ml-2 animate-pulse bg-green-500">LIVE</Badge>
              )}
            </CardTitle>
            {isEnterprise && tracking?.slaStatus && (
              <CardDescription>
                SLA Status: {tracking.slaStatus.onSite}/{tracking.slaStatus.totalProviders} on-site ·
                {tracking.slaStatus.slaBreached ? " ⚠ SLA breach detected" : " ✓ Within SLA"}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {loadTracking ? (
              <div className="py-8 text-center text-muted-foreground text-sm">Loading tracking data...</div>
            ) : !tracking?.providers?.length ? (
              <div className="py-8 text-center space-y-2">
                <MapPin className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No tracking data yet. Provider hasn't started sharing their location.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(tracking.providers as Array<{ userId: string; latitude: number; longitude: number; status: string; etaMinutes: number | null; speedKmh: number; isSharing: boolean; lastUpdated: string }>).map(p => {
                  const sc = statusConfig[p.status] ?? statusConfig.en_route;
                  const Icon = sc.icon;
                  return (
                    <div key={p.userId} className="border rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Provider</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${sc.color}`}>
                            <Icon className="h-3 w-3" />{sc.label}
                          </span>
                        </div>
                        {p.isSharing && <Badge variant="outline" className="text-xs text-green-600 border-green-300">Sharing</Badge>}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-xs text-muted-foreground">Coordinates</p>
                          <p className="font-mono text-xs">{p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}</p>
                        </div>
                        {p.etaMinutes !== null && (
                          <div>
                            <p className="text-xs text-muted-foreground">ETA</p>
                            <p className="font-medium flex items-center gap-1"><Clock className="h-3 w-3" />{p.etaMinutes} min</p>
                          </div>
                        )}
                        {p.speedKmh > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground">Speed</p>
                            <p className="font-medium">{p.speedKmh} km/h</p>
                          </div>
                        )}
                        <div>
                          <p className="text-xs text-muted-foreground">Last Update</p>
                          <p className="text-xs">{new Date(p.lastUpdated).toLocaleTimeString("en-IN")}</p>
                        </div>
                      </div>
                      {p.status === "on_site" && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-xs text-green-700 flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3" />
                          Provider has arrived at your location.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {tracking?.privacyNote && (
              <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                <Shield className="h-3 w-3" />{tracking.privacyNote}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Sustainability Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Leaf className="h-4 w-4 text-green-600" />
              Sustainability Score
            </CardTitle>
            <CardDescription>Carbon footprint and route efficiency for this job</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadSustain ? (
              <div className="py-4 text-center text-muted-foreground text-sm">Loading...</div>
            ) : sustainability?.records?.length > 0 ? (
              <>
                {sustainability.summary?.message && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700 font-medium">
                    {sustainability.summary.message}
                  </div>
                )}
                {sustainability.summary?.totalCarbonSavedKg !== undefined && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "Carbon Saved", value: `${sustainability.summary.totalCarbonSavedKg.toFixed(2)} kg` },
                      { label: "Fuel Saved", value: `${sustainability.summary.totalFuelSavedLitres.toFixed(2)} L` },
                      { label: "Efficiency", value: `${sustainability.summary.avgEfficiencyScore.toFixed(0)}%` },
                      { label: "Local Match Rate", value: sustainability.summary.localMatchRate },
                    ].map(s => (
                      <div key={s.label} className="bg-green-50/60 rounded-xl p-3 text-center">
                        <p className="text-lg font-semibold text-green-700">{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}
                {(sustainability.records as Array<{ bidId: string | null; distanceKm: number; estimatedCarbonKg: number; routeEfficiencyScore: number; sustainabilityLabel: string; fuelSavedLitres: number }>).map((r, i) => (
                  <div key={i} className={`border rounded-xl p-4 ${sustainabilityColors[r.sustainabilityLabel] ?? ""}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm capitalize">{r.sustainabilityLabel.replace("_", " ")}</span>
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                      <div><p className="opacity-70">Distance</p><p className="font-semibold">{r.distanceKm.toFixed(1)} km</p></div>
                      <div><p className="opacity-70">Carbon</p><p className="font-semibold">{r.estimatedCarbonKg.toFixed(2)} kg</p></div>
                      <div><p className="opacity-70">Efficiency</p><p className="font-semibold">{r.routeEfficiencyScore.toFixed(0)}%</p></div>
                      <div><p className="opacity-70">Fuel Saved</p><p className="font-semibold">{r.fuelSavedLitres.toFixed(2)} L</p></div>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <div className="text-center py-4">
                <Leaf className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-3">No sustainability data yet.</p>
                <Button size="sm" variant="outline" onClick={() => setShowSustainabilityForm(true)}>Compute Sustainability</Button>
              </div>
            )}

            {showSustainabilityForm && (
              <div className="border rounded-xl p-4 space-y-3">
                <p className="text-sm font-medium">Enter coordinates to compute carbon footprint</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Provider Lat</Label>
                    <Input value={provLat} onChange={e => setProvLat(e.target.value)} className="mt-1 font-mono text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Provider Lon</Label>
                    <Input value={provLng} onChange={e => setProvLng(e.target.value)} className="mt-1 font-mono text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Job Lat</Label>
                    <Input value={reqLat} onChange={e => setReqLat(e.target.value)} className="mt-1 font-mono text-xs" />
                  </div>
                  <div>
                    <Label className="text-xs">Job Lon</Label>
                    <Input value={reqLng} onChange={e => setReqLng(e.target.value)} className="mt-1 font-mono text-xs" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => computeSustainability.mutate()} disabled={computeSustainability.isPending}>
                    {computeSustainability.isPending ? "Computing..." : "Compute"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowSustainabilityForm(false)}>Cancel</Button>
                </div>
              </div>
            )}

            {sustainability?.records?.length === 0 && !showSustainabilityForm && (
              <Button size="sm" variant="outline" className="w-full" onClick={() => setShowSustainabilityForm(true)}>
                <Leaf className="h-4 w-4 mr-1" />
                Compute Carbon Footprint
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Alert for missing GPS categories */}
        {!isProvider && (
          <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/30 rounded-xl p-4">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>GPS tracking is required for logistics, home services, healthcare, events, security, and fleet categories. Providers must enable location sharing after bid acceptance.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
