import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useListCategories, useCreateRequirement, getListRequirementsQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { getCategoryIcon } from "@/lib/category-icons";
import { IndianRupee, Loader2, PlusCircle, Clock, RefreshCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import type { Category } from "@workspace/api-client-react";

const RECURRING_INTERVALS = [
  { value: "weekly", label: "Every week" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Every month" },
  { value: "quarterly", label: "Every quarter" },
];

const schema = z.object({
  categoryId: z.string().min(1, "Select a category"),
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  city: z.string().min(2, "Enter your city"),
  state: z.string().min(2, "Enter your state"),
  maxBudget: z.number().min(100, "Budget must be at least ₹100"),
  deadlineHours: z.number().min(1).max(72),
  customData: z.record(z.string()).optional(),
  isRecurring: z.boolean(),
  recurringInterval: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

const DEADLINE_OPTIONS = [
  { value: 2, label: "2 hours" },
  { value: 6, label: "6 hours" },
  { value: 12, label: "12 hours" },
  { value: 24, label: "1 day" },
  { value: 48, label: "2 days" },
  { value: 72, label: "3 days" },
];

export default function NewRequirement() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: categories } = useListCategories();
  const createMutation = useCreateRequirement();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      categoryId: "",
      title: "",
      description: "",
      city: user?.city ?? "",
      state: user?.state ?? "",
      maxBudget: 5000,
      deadlineHours: 24,
      customData: {},
      isRecurring: false,
      recurringInterval: "",
    },
  });

  const selectedCategoryId = form.watch("categoryId");
  const maxBudget = form.watch("maxBudget");
  const isRecurring = form.watch("isRecurring");
  const selectedCategory = categories?.find((c: Category) => c.id === selectedCategoryId);

  const onSubmit = (data: FormData) => {
    createMutation.mutate(
      {
        data: {
          categoryId: data.categoryId,
          title: data.title,
          description: data.description,
          city: data.city,
          state: data.state,
          maxBudget: data.maxBudget,
          deadlineHours: data.deadlineHours,
          customData: data.customData,
          isRecurring: data.isRecurring,
          recurringInterval: data.recurringInterval || undefined,
        },
      },
      {
        onSuccess: (req) => {
          toast({ title: "Requirement posted!", description: "Providers will start bidding shortly." });
          qc.invalidateQueries({ queryKey: getListRequirementsQueryKey() });
          setLocation(`/requirements/${req.id}`);
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to post requirement", variant: "destructive" });
        },
      }
    );
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Post a Problem</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Describe what you need and set your maximum budget. Providers will compete to win your project.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {/* Category */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Category</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {categories?.map((cat: Category) => {
                          const Icon = getCategoryIcon(cat.iconName);
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => field.onChange(cat.id)}
                              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${field.value === cat.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                              data-testid={`button-cat-${cat.slug}`}
                            >
                              <Icon className={`h-5 w-5 ${field.value === cat.id ? "text-primary" : "text-muted-foreground"}`} />
                              <span className="text-[11px] font-medium text-center leading-tight">{cat.name}</span>
                            </button>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Problem Details */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Problem Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Need ACL surgery package in Hyderabad" data-testid="input-title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your requirement in detail. The more you share, the better bids you'll receive."
                        rows={4}
                        data-testid="input-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                {/* Dynamic Category Fields */}
                {selectedCategory?.customFields && (selectedCategory.customFields as Array<{key: string; label: string; type: string; options?: string[]; required?: boolean}>).map((cf) => (
                  <FormField
                    key={cf.key}
                    control={form.control}
                    name={`customData.${cf.key}` as "customData"}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{cf.label}{cf.required && <span className="text-destructive ml-1">*</span>}</FormLabel>
                        <FormControl>
                          {cf.type === "select" && cf.options ? (
                            <Select onValueChange={field.onChange} value={String(field.value ?? "")}>
                              <SelectTrigger data-testid={`select-${cf.key}`}>
                                <SelectValue placeholder={`Select ${cf.label}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {cf.options.map((opt) => (
                                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input placeholder={cf.label} data-testid={`input-${cf.key}`} value={String(field.value ?? "")} onChange={field.onChange} />
                          )}
                        </FormControl>
                      </FormItem>
                    )}
                  />
                ))}
              </CardContent>
            </Card>

            {/* Location & Budget */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Location & Budget</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl><Input placeholder="Bangalore" data-testid="input-city" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="state" render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl><Input placeholder="Karnataka" data-testid="input-state" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="maxBudget" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center justify-between">
                      <span>Maximum Budget</span>
                      <span className="flex items-center gap-0.5 font-bold text-primary">
                        <IndianRupee className="h-4 w-4" />
                        {field.value.toLocaleString("en-IN")}
                        {field.value > 10000 && <Badge className="ml-1 text-[10px] bg-amber-500 text-white">High Value</Badge>}
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Slider
                        min={500}
                        max={500000}
                        step={500}
                        value={[field.value]}
                        onValueChange={(v) => field.onChange(v[0])}
                        className="mt-2"
                        data-testid="slider-budget"
                      />
                    </FormControl>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>₹500</span>
                      <span>₹5,00,000</span>
                    </div>
                  </FormItem>
                )} />

                <FormField control={form.control} name="deadlineHours" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      Auction Duration
                    </FormLabel>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-1">
                      {DEADLINE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => field.onChange(opt.value)}
                          className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${field.value === opt.value ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/40"}`}
                          data-testid={`button-deadline-${opt.value}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            {/* Recurring */}
            <Card>
              <CardContent className="p-4 space-y-3">
                <FormField control={form.control} name="isRecurring" render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel className="flex items-center gap-1.5">
                        <RefreshCw className="h-4 w-4 text-blue-600" />
                        Recurring Requirement
                      </FormLabel>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        One-click repost when this auction closes. E.g. weekly office cleaning.
                      </p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-recurring" />
                    </FormControl>
                  </FormItem>
                )} />

                {isRecurring && (
                  <FormField control={form.control} name="recurringInterval" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">How often?</FormLabel>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        {RECURRING_INTERVALS.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => field.onChange(opt.value)}
                            className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${field.value === opt.value ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-700" : "border-border hover:border-blue-300"}`}
                            data-testid={`button-interval-${opt.value}`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </FormItem>
                  )} />
                )}
              </CardContent>
            </Card>

            <Button type="submit" size="lg" className="w-full font-semibold" disabled={createMutation.isPending} data-testid="button-submit">
              {createMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <PlusCircle className="h-4 w-4 mr-2" />
              )}
              Post Requirement
            </Button>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
