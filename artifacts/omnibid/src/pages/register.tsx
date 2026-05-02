import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { useRegister } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Gavel, Loader2, ShoppingBag, Briefcase, Users } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["buyer", "provider", "both"]),
  city: z.string().optional(),
  state: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const roleOptions = [
  { value: "buyer", label: "Buyer — Post Problems", icon: ShoppingBag, desc: "I need services" },
  { value: "provider", label: "Provider — Bid for Work", icon: Briefcase, desc: "I offer services" },
  { value: "both", label: "Both", icon: Users, desc: "Buy and sell" },
];

export default function Register() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const registerMutation = useRegister();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", password: "", role: "buyer", city: "", state: "" },
  });

  const selectedRole = form.watch("role");

  const onSubmit = (data: FormData) => {
    registerMutation.mutate(
      { data: { name: data.name, email: data.email, password: data.password, role: data.role, phone: data.phone || undefined, city: data.city || undefined, state: data.state || undefined } },
      {
        onSuccess: (res) => {
          login(res.token);
          toast({ title: "Welcome to OmniBid!", description: "Your account has been created." });
          setLocation(res.user.role === "provider" ? "/dashboard/provider" : "/dashboard/buyer");
        },
        onError: (err: unknown) => {
          const msg = err instanceof Error ? err.message : "Registration failed";
          toast({ title: "Error", description: msg, variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Gavel className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg text-primary">OmniBid</span>
          </div>
          <CardTitle className="text-xl">Create your account</CardTitle>
          <CardDescription>Join India's reverse auction marketplace</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Role Selection */}
              <div>
                <p className="text-sm font-medium mb-2">I want to</p>
                <div className="grid grid-cols-3 gap-2">
                  {roleOptions.map((opt) => {
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => form.setValue("role", opt.value as "buyer" | "provider" | "both")}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-center ${selectedRole === opt.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                        data-testid={`button-role-${opt.value}`}
                      >
                        <Icon className={`h-5 w-5 ${selectedRole === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="text-[11px] font-medium leading-tight">{opt.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="Ravi Kumar" data-testid="input-name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input placeholder="ravi@example.com" type="email" data-testid="input-email" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone (optional)</FormLabel>
                    <FormControl><Input placeholder="9876543210" data-testid="input-phone" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>City (optional)</FormLabel>
                    <FormControl><Input placeholder="Bangalore" data-testid="input-city" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Password</FormLabel>
                    <FormControl><Input placeholder="••••••••" type="password" data-testid="input-password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <Button type="submit" className="w-full font-semibold" disabled={registerMutation.isPending} data-testid="button-submit">
                {registerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
              </Button>
            </form>
          </Form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <Link href="/login" className="text-primary font-medium hover:underline" data-testid="link-login">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
