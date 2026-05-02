import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useListNotifications } from "@workspace/api-client-react";
import {
  Bell,
  ChevronDown,
  Gavel,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Scale,
  User,
  CreditCard,
} from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  const { data: notifs } = useListNotifications({
    query: { enabled: !!user, queryKey: ["notifications"] },
  });
  const unreadCount = notifs?.filter((n) => !n.isRead).length ?? 0;

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  const isProvider = user?.role === "provider" || user?.role === "both";
  const isBuyer = user?.role === "buyer" || user?.role === "both";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
                <Gavel className="h-5 w-5" />
                <span>OmniBid</span>
              </Link>
              <nav className="hidden md:flex items-center gap-4">
                <Link href="/requirements" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Browse
                </Link>
                {isBuyer && (
                  <Link href="/requirements/new" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Post Problem
                  </Link>
                )}
              </nav>
            </div>

            <div className="flex items-center gap-2">
              {user ? (
                <>
                  {isBuyer && (
                    <Button
                      size="sm"
                      className="hidden sm:flex"
                      onClick={() => setLocation("/requirements/new")}
                      data-testid="button-post-problem"
                    >
                      <PlusCircle className="h-4 w-4 mr-1" />
                      Post Problem
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    onClick={() => setLocation("/notifications")}
                    data-testid="button-notifications"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 text-[10px] flex items-center justify-center bg-destructive text-destructive-foreground">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </Badge>
                    )}
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="flex items-center gap-1" data-testid="button-user-menu">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {user.name[0]}
                        </div>
                        <span className="hidden sm:inline text-sm">{user.name.split(" ")[0]}</span>
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {isBuyer && (
                        <DropdownMenuItem onClick={() => setLocation("/dashboard/buyer")} data-testid="menu-buyer-dashboard">
                          <LayoutDashboard className="h-4 w-4 mr-2" />
                          Buyer Dashboard
                        </DropdownMenuItem>
                      )}
                      {isProvider && (
                        <DropdownMenuItem onClick={() => setLocation("/dashboard/provider")} data-testid="menu-provider-dashboard">
                          <LayoutDashboard className="h-4 w-4 mr-2" />
                          Provider Dashboard
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setLocation(`/profile/${user.id}`)} data-testid="menu-profile">
                        <User className="h-4 w-4 mr-2" />
                        Profile
                      </DropdownMenuItem>
                      {isProvider && (
                        <DropdownMenuItem onClick={() => setLocation("/subscriptions")} data-testid="menu-subscriptions">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Plans
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setLocation("/disputes")} data-testid="menu-disputes">
                        <Scale className="h-4 w-4 mr-2" />
                        Disputes
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-destructive" data-testid="menu-logout">
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setLocation("/login")} data-testid="button-login">
                    Login
                  </Button>
                  <Button size="sm" onClick={() => setLocation("/register")} data-testid="button-register">
                    Join Free
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
