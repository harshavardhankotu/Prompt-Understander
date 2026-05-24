import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Users, ClipboardList, CreditCard, AlertTriangle, TrendingUp,
  Settings, Shield, Edit3, CheckCircle2, XCircle, Search,
  Building2, Gavel, MapPin,
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

type AdminStats = {
  users: Record<string, number>;
  requirements: Record<string, number>;
  bids: Record<string, number>;
  payments: Record<string, number>;
  disputes: Record<string, number>;
  topSectors: { name: string; slug: string; count: number; floor: number }[];
  topCities: { city: string; count: number }[];
};

type AdminCategory = { id: string; name: string; slug: string; iconName: string; priceFloor: number; requirementCount: number; bidCount: number };
type AdminUser = { id: string; name: string; email: string; role: string; city: string | null; isVerified: boolean; trustScore: number; omniScore: number; createdAt: string };

function StatCard({ label, value, sub, icon }: { label: string; value: string | number; sub?: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryFloorEditor({ cat, onSave }: { cat: AdminCategory; onSave: (id: string, floor: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [floor, setFloor] = useState(String(cat.priceFloor));

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/20 transition-colors">
      <div className="flex-1">
        <p className="text-sm font-medium">{cat.name}</p>
        <p className="text-xs text-muted-foreground">{cat.requirementCount} requirements · {cat.bidCount} bids</p>
      </div>
      <div className="flex items-center gap-2">
        {editing ? (
          <>
            <Input
              type="number"
              value={floor}
              onChange={e => setFloor(e.target.value)}
              className="w-24 h-7 text-sm"
              onKeyDown={e => { if (e.key === "Enter") { onSave(cat.id, Number(floor)); setEditing(false); } }}
            />
            <Button size="sm" className="h-7 px-2 text-xs" onClick={() => { onSave(cat.id, Number(floor)); setEditing(false); }}>Save</Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditing(false)}>Cancel</Button>
          </>
        ) : (
          <>
            <span className="text-sm font-semibold">₹{Number(cat.priceFloor).toLocaleString("en-IN")}</span>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditing(true)}>
              <Edit3 className="h-3 w-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function UserEditDialog({ user, open, onClose, onSave }: { user: AdminUser | null; open: boolean; onClose: () => void; onSave: (id: string, data: Partial<{ isVerified: boolean; trustScore: number; omniScore: number }>) => void }) {
  const [isVerified, setIsVerified] = useState(user?.isVerified ?? false);
  const [trustScore, setTrustScore] = useState(user?.trustScore ?? 0);
  const [omniScore, setOmniScore] = useState(user?.omniScore ?? 0);

  if (!user) return null;
  return (
    <Dialog open={open} onOpenChange={open => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User: {user.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="text-sm text-muted-foreground">{user.email} · {user.role}</div>
          <Separator />
          <div className="flex items-center justify-between">
            <Label>Verified</Label>
            <Switch checked={isVerified} onCheckedChange={setIsVerified} />
          </div>
          <div className="space-y-1">
            <Label>Trust Score (0–100)</Label>
            <Input type="number" min={0} max={100} value={trustScore} onChange={e => setTrustScore(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Set to 100+ to grant admin access</p>
          </div>
          <div className="space-y-1">
            <Label>OmniScore (0–1000)</Label>
            <Input type="number" min={0} max={1000} value={omniScore} onChange={e => setOmniScore(Number(e.target.value))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onSave(user.id, { isVerified, trustScore, omniScore }); onClose(); }}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [userSearch, setUserSearch] = useState("");
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [page] = useState(1);

  const isAdmin = (user?.trustScore ?? 0) >= 100 || user?.email?.endsWith?.("@omnibid.admin");

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/admin/stats"],
    queryFn: async () => {
      const res = await authFetch("/admin/stats");
      if (!res.ok) throw new Error("Admin only");
      return res.json();
    },
    enabled: !!user && isAdmin,
  });

  const { data: categories, isLoading: catsLoading } = useQuery<AdminCategory[]>({
    queryKey: ["/admin/categories"],
    queryFn: async () => {
      const res = await authFetch("/admin/categories");
      if (!res.ok) throw new Error("Admin only");
      return res.json();
    },
    enabled: !!user && isAdmin,
  });

  const { data: usersData, isLoading: usersLoading } = useQuery<{ users: AdminUser[]; total: number; pages: number }>({
    queryKey: ["/admin/users", page],
    queryFn: async () => {
      const res = await authFetch(`/admin/users?page=${page}`);
      if (!res.ok) throw new Error("Admin only");
      return res.json();
    },
    enabled: !!user && isAdmin,
  });

  const updateFloor = useMutation({
    mutationFn: async ({ id, floor }: { id: string; floor: number }) => {
      const res = await authFetch(`/admin/categories/${id}/floor`, { method: "PUT", body: JSON.stringify({ floor }) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/categories"] });
      toast({ title: "Price floor updated!" });
    },
    onError: () => toast({ title: "Failed to update floor", variant: "destructive" }),
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<{ isVerified: boolean; trustScore: number; omniScore: number }> }) => {
      const res = await authFetch(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/admin/users", page] });
      toast({ title: "User updated!" });
    },
    onError: () => toast({ title: "Failed to update user", variant: "destructive" }),
  });

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-16 text-muted-foreground">Please log in.</div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="text-center py-16">
          <AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold">Admin Access Required</h2>
          <p className="text-muted-foreground mt-2 text-sm">Your account needs admin privileges (trust_score ≥ 100).</p>
          <p className="text-xs text-muted-foreground mt-1">Demo: Use the QA page to promote your account to admin.</p>
        </div>
      </Layout>
    );
  }

  const filteredUsers = (usersData?.users ?? []).filter(u =>
    !userSearch || u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const ROLE_COLOR: Record<string, string> = {
    retail_buyer: "bg-blue-100 text-blue-700",
    enterprise_buyer: "bg-purple-100 text-purple-700",
    solo_provider: "bg-green-100 text-green-700",
    agency_provider: "bg-teal-100 text-teal-700",
    buyer: "bg-blue-100 text-blue-700",
    provider: "bg-green-100 text-green-700",
    both: "bg-yellow-100 text-yellow-700",
  };

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Settings className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Control Panel</h1>
            <p className="text-muted-foreground text-sm">OmniBid India Platform Management</p>
          </div>
          <Badge className="ml-auto bg-red-100 text-red-700">Admin</Badge>
        </div>

        {statsLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[0,1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={stats.users.total ?? 0} sub={`${stats.users.newThisMonth ?? 0} this month`} icon={<Users className="h-4 w-4" />} />
            <StatCard label="Requirements" value={stats.requirements.total ?? 0} sub={`${stats.requirements.open ?? 0} open`} icon={<ClipboardList className="h-4 w-4" />} />
            <StatCard label="GMV" value={`₹${(stats.payments.volume ?? 0).toLocaleString("en-IN")}`} sub={`₹${(stats.payments.revenue ?? 0).toLocaleString("en-IN")} revenue`} icon={<TrendingUp className="h-4 w-4" />} />
            <StatCard label="Open Disputes" value={stats.disputes.open ?? 0} sub={`${stats.disputes.total ?? 0} total`} icon={<AlertTriangle className="h-4 w-4" />} />
          </div>
        ) : null}

        <Tabs defaultValue="categories">
          <TabsList>
            <TabsTrigger value="categories">Category Management</TabsTrigger>
            <TabsTrigger value="users">User Management</TabsTrigger>
            <TabsTrigger value="sectors">Sector Activity</TabsTrigger>
            <TabsTrigger value="cities">City Activity</TabsTrigger>
          </TabsList>

          {/* Category Floor Management */}
          <TabsContent value="categories" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Category Price Floors</CardTitle>
                <CardDescription className="text-xs">Minimum bid price per category — protects against race-to-bottom pricing. Click the pencil icon to edit.</CardDescription>
              </CardHeader>
              <CardContent>
                {catsLoading ? (
                  <div className="space-y-2">{[0,1,2,3,4].map(i => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
                ) : (
                  <div className="space-y-2">
                    {(categories ?? []).map(cat => (
                      <CategoryFloorEditor
                        key={cat.id}
                        cat={cat}
                        onSave={(id, floor) => updateFloor.mutate({ id, floor })}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management */}
          <TabsContent value="users" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">User Management</CardTitle>
                <CardDescription className="text-xs">Verify users, adjust trust scores, grant admin. Total: {usersData?.total ?? 0} users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search by name or email…" value={userSearch} onChange={e => setUserSearch(e.target.value)} />
                </div>
                {usersLoading ? (
                  <div className="space-y-2">{[0,1,2,3].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
                ) : (
                  <div className="space-y-2">
                    {filteredUsers.map(u => (
                      <div key={u.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">{u.name[0]}</div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium">{u.name}</p>
                              {u.isVerified && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
                              {u.trustScore >= 100 && <Badge className="text-[10px] py-0 bg-red-100 text-red-700">Admin</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground">{u.email} · {u.city ?? "—"}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${ROLE_COLOR[u.role] ?? "bg-muted text-muted-foreground"}`}>{u.role}</Badge>
                          <span className="text-xs text-muted-foreground">Score: {u.omniScore}</span>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditUser(u)}>
                            <Edit3 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {filteredUsers.length === 0 && (
                      <p className="text-sm text-muted-foreground py-6 text-center">No users found</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sector Activity */}
          <TabsContent value="sectors" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Sector Activity</CardTitle>
                <CardDescription className="text-xs">Requirements and bid activity by sector</CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? <Skeleton className="h-64 w-full" /> : (
                  <div className="space-y-2">
                    {(stats?.topSectors ?? []).map((s, i) => (
                      <div key={s.name ?? i} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">{i + 1}</div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">Floor: ₹{(s.floor ?? 0).toLocaleString("en-IN")}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">{s.count}</p>
                          <p className="text-xs text-muted-foreground">requirements</p>
                        </div>
                        <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(((s.count) / Math.max(...(stats?.topSectors ?? []).map(x => x.count ?? 0), 1)) * 100, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                    {(stats?.topSectors ?? []).length === 0 && (
                      <p className="text-sm text-muted-foreground py-6 text-center">No sector data yet</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* City Activity */}
          <TabsContent value="cities" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">City Activity</CardTitle>
                <CardDescription className="text-xs">Top cities by requirement count</CardDescription>
              </CardHeader>
              <CardContent>
                {statsLoading ? <Skeleton className="h-64 w-full" /> : (
                  <div className="space-y-2">
                    {(stats?.topCities ?? []).map((c, i) => (
                      <div key={c.city} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">{i + 1}</div>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium flex-1">{c.city}</p>
                        <p className="text-sm font-bold">{c.count}</p>
                        <p className="text-xs text-muted-foreground w-20">requirements</p>
                        <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${Math.min(((c.count) / Math.max(...(stats?.topCities ?? []).map(x => x.count ?? 0), 1)) * 100, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                    {(stats?.topCities ?? []).length === 0 && (
                      <p className="text-sm text-muted-foreground py-6 text-center">No city data yet — post some requirements!</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* User edit dialog */}
      <UserEditDialog
        user={editUser}
        open={!!editUser}
        onClose={() => setEditUser(null)}
        onSave={(id, data) => updateUser.mutate({ id, data })}
      />
    </Layout>
  );
}
