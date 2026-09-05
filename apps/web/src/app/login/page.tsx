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
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50/70 text-slate-900 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-1 text-xs font-semibold text-slate-700 shadow-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            CommerceOS Operations Hub
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {isExtensionCallback
              ? "Link Chrome Extension"
              : "Merchant Command Access"}
          </h1>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isExtensionCallback
              ? "Authenticate to grant autonomous buying authority to your Chrome Extension."
              : "Sign in with your merchant credentials to orchestrate autonomous commerce."}
          </p>
        </div>

        {/* Login Form Card */}
        <Card className="border border-slate-200/90 bg-white shadow-xs rounded-2xl overflow-hidden">
          <form onSubmit={handleSubmit}>
            <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-5">
              <CardTitle className="text-sm font-bold text-slate-900">Merchant Credentials</CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Enter your registered store owner credentials.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 p-5">
              {error && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-medium text-slate-700"
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
                  className="h-9 rounded-lg border-slate-200 bg-white text-slate-900 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="text-xs font-medium text-slate-700"
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
                  className="h-9 rounded-lg border-slate-200 bg-white text-slate-900 text-xs"
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 p-5 pt-0">
              <Button
                type="submit"
                className="w-full h-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold shadow-xs cursor-pointer text-xs"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? "Authenticating..."
                  : isExtensionCallback
                  ? "Authorize & Link Extension"
                  : "Sign In to Control Center"}
              </Button>

              <div className="text-center text-xs text-slate-500">
                Need to register a store?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-slate-900 hover:underline"
                >
                  Register Store
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Demo Credentials Helper for Judges / Testers */}
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-xs space-y-2 shadow-xs">
          <div className="flex items-center justify-between font-semibold text-slate-800">
            <span>Demo Store Credentials:</span>
            <button
              type="button"
              onClick={handleQuickFillDemo}
              className="text-blue-700 hover:underline cursor-pointer font-semibold text-xs"
            >
              Fill Demo Info
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-slate-600 font-mono text-[11px]">
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
