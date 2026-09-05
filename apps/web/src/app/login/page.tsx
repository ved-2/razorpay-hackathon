"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { loginUser } from "@/lib/auth";
import { CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession, isAuthenticated, isLoading: authLoading, token, merchant, user } =
    useAuth();

  const isExtensionCallback =
    searchParams.get("callback") === "extension" ||
    searchParams.get("source") === "extension";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extensionConnected, setExtensionConnected] = useState(false);

  // If already authenticated and opened via extension callback, notify bridge
  useEffect(() => {
    if (isAuthenticated && isExtensionCallback && token) {
      window.postMessage(
        {
          type: "COMMERCEOS_AUTH_SUCCESS",
          token,
          merchant,
          user,
        },
        "*"
      );
      setExtensionConnected(true);
    } else if (isAuthenticated && !isExtensionCallback) {
      router.push("/");
    }
  }, [isAuthenticated, isExtensionCallback, token, merchant, user, router]);

  // Listen for extension bridge acknowledgment
  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data && e.data.type === "COMMERCEOS_EXTENSION_CONNECTED") {
        setExtensionConnected(true);
      }
    };
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const authRes = await loginUser({ email: email.trim(), password });
      await refreshSession();

      if (isExtensionCallback) {
        // Send handover message to Chrome extension content script
        window.postMessage(
          {
            type: "COMMERCEOS_AUTH_SUCCESS",
            token: authRes.token,
            merchant: authRes.merchant,
            user: authRes.user,
          },
          "*"
        );
        setExtensionConnected(true);
      } else {
        router.push("/");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFillDemo = () => {
    setEmail("demo@commerceos.io");
    setPassword("password123");
    setError(null);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="text-sm text-muted-foreground">Checking session...</div>
      </div>
    );
  }

  // Extension Connected Success Screen
  if (extensionConnected && isExtensionCallback) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/20 px-4 py-12">
        <div className="w-full max-w-md space-y-6">
          <Card className="border-emerald-500/30 bg-card shadow-sm p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-foreground">
                Extension Connected!
              </h2>
              <p className="text-xs text-muted-foreground">
                Your merchant credentials have been securely linked to the{" "}
                <strong>CommerceOS Autonomous AI Buyer</strong> extension.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs text-left space-y-1 font-mono">
              <div>Store: {merchant?.name || "Apex Athletics"}</div>
              <div>User: {user?.email || email || "demo@commerceos.io"}</div>
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                You can now close this tab and return to the Chrome Extension.
              </p>
              <Link href="/">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Go to Merchant Dashboard
                  <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </Card>
        </div>
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
            CommerceOS Control Center
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isExtensionCallback
              ? "Link Chrome Extension"
              : "Sign in to your store"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isExtensionCallback
              ? "Authenticate to grant autonomous buying authority to the Chrome Extension."
              : "Enter your merchant credentials to access autonomous operations."}
          </p>
        </div>

        {/* Login Form Card */}
        <Card className="border-border/60 shadow-sm">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Merchant Login</CardTitle>
              <CardDescription>
                Authenticate with your email and password.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-xs font-medium text-foreground"
                >
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="merchant@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-xs font-medium text-foreground"
                >
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3">
              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Authenticating..."
                  : isExtensionCallback
                  ? "Authorize & Link Extension"
                  : "Sign In"}
              </Button>

              <div className="text-center text-xs text-muted-foreground">
                Don&apos;t have a merchant account?{" "}
                <Link
                  href="/register"
                  className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                >
                  Register Store
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Demo Credentials Helper for Judges / Testers */}
        <div className="rounded-xl border border-dashed border-border/80 bg-background/60 p-4 text-xs space-y-2">
          <div className="flex items-center justify-between font-medium text-foreground">
            <span>Demo Store Credentials:</span>
            <button
              type="button"
              onClick={handleQuickFillDemo}
              className="text-primary hover:underline cursor-pointer font-medium"
            >
              Fill Demo Info
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-muted-foreground font-mono text-[11px]">
            <div>Email: demo@commerceos.io</div>
            <div>Password: password123</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-muted/20">
          <div className="text-sm text-muted-foreground">Loading login...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
