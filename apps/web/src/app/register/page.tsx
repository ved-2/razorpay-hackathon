"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, isLoading: authLoading } = useAuth();

  const [merchantName, setMerchantName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!merchantName.trim() || !name.trim() || !email.trim() || !password) {
      setError("Please fill out all required fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await register({
        merchantName: merchantName.trim(),
        name: name.trim(),
        email: email.trim(),
        password,
      });
      router.push("/");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create merchant account. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-sm text-muted-foreground">Checking session...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/20 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-foreground shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            CommerceOS Onboarding
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Launch your autonomous store
          </h1>
          <p className="text-sm text-muted-foreground">
            Set up your merchant workspace and activate AI commerce operations.
          </p>
        </div>

        {/* Register Form Card */}
        <Card className="border-border/60 shadow-sm">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Create Store Account</CardTitle>
              <CardDescription>
                Enter your details to register your brand.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="merchantName"
                  className="text-xs font-medium text-foreground"
                >
                  Store / Brand Name
                </label>
                <Input
                  id="merchantName"
                  placeholder="e.g. Apex Athletics"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="name"
                  className="text-xs font-medium text-foreground"
                >
                  Owner Full Name
                </label>
                <Input
                  id="name"
                  placeholder="e.g. Aarav Sharma"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-medium text-foreground"
                >
                  Work Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="merchant@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="text-xs font-medium text-foreground"
                >
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Must be at least 8 characters long.
                </p>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating store..." : "Create Store Account"}
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                Already have a merchant account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                >
                  Sign In
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
