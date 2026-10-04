"use client";

import { AppBackground } from "@/components/ui/AppBackground";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiClientError } from "@/lib/api/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

// ─── Validation schema ────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Must be a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ─── Fernleaf leaf SVG icon (shared between mobile brand + brand panel) ───────

function FernleafIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <path d="M12 20C12 20 11.8 12.5 15.5 7" strokeLinecap="round" />
      <path d="M13.5 13C10 10 7 10 5 11" strokeLinecap="round" />
      <path d="M14.2 10C17.2 7.5 19.5 7.5 21 8" strokeLinecap="round" />
      <path d="M12 17C9 14.8 6.8 14.8 5.2 15.5" strokeLinecap="round" />
    </svg>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // Redirect already-authenticated users away from the login page
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, authLoading, router]);

  // ── Submit handler ─────────────────────────────────────────────────────────

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);

    try {
      await login(values);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.statusCode === 401) {
          setServerError("Invalid email or password. Please try again.");
        } else if (err.statusCode === 400) {
          const msg = Array.isArray(err.raw.message)
            ? err.raw.message.join(", ")
            : err.raw.message;

          setServerError(msg || "Invalid request. Please check your input.");
        } else {
          setServerError("Something went wrong. Please try again.");
        }
      } else {
        setServerError("Something went wrong. Please try again.");
      }
    }
  };

  // ── Auth loading state ─────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <AppBackground>
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#d9d2c2] bg-white shadow-sm">
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#315d3c] border-t-transparent" />
            </div>
            <span className="text-xs tracking-[0.2em] text-[#7d806f] uppercase">
              Loading
            </span>
          </div>
        </div>
      </AppBackground>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <AppBackground>
      <div className="flex min-h-screen items-center justify-center px-5 py-10 lg:px-10">
        {/*
         * Two-column card:
         *   Left  — brand panel (desktop only)
         *   Right — login form
         */}
        <div className="grid w-full max-w-6xl overflow-hidden rounded-[28px] border border-[#d9d2c2] bg-[#fbfaf6]/90 shadow-[0_30px_100px_rgba(38,53,42,0.10)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">

          {/* ── Brand panel (desktop) ──────────────────────────────────── */}
          <section
            className="relative hidden min-h-[650px] overflow-hidden bg-[#294d33] p-12 text-[#f8f5eb] lg:flex lg:flex-col"
            aria-label="Fernleaf Kitchen brand"
          >
            {/* Dot-grid texture */}
            <div
              className="absolute inset-0 opacity-[0.055]"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                backgroundSize: "22px 22px",
              }}
              aria-hidden="true"
            />

            {/* Oversized decorative leaf */}
            <svg
              className="absolute -bottom-20 -right-24 h-[500px] w-[500px] text-white/[0.055]"
              viewBox="0 0 500 500"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M120 460C120 460 165 300 350 95"
                stroke="currentColor"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d="M170 350C105 300 70 295 35 310C80 355 125 365 170 350Z"
                fill="currentColor"
              />
              <path
                d="M205 300C270 235 320 220 375 235C330 285 270 310 205 300Z"
                fill="currentColor"
              />
              <path
                d="M250 230C205 175 170 155 125 160C155 210 200 240 250 230Z"
                fill="currentColor"
              />
              <path
                d="M290 180C335 135 375 125 415 140C375 180 335 195 290 180Z"
                fill="currentColor"
              />
            </svg>

            {/* Brand content */}
            <div className="relative z-10 flex h-full flex-col">
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 backdrop-blur">
                  <FernleafIcon />
                </div>
                <div>
                  <p className="text-sm font-semibold tracking-wide">
                    Fernleaf
                  </p>
                  <p className="text-[10px] tracking-[0.22em] text-white/50 uppercase">
                    Kitchen
                  </p>
                </div>
              </div>

              {/* Hero copy */}
              <div className="mt-auto max-w-md pb-8">
                <div className="mb-6 flex items-center gap-3">
                  <span className="h-px w-10 bg-[#c8a96b]" />
                  <span className="text-[10px] font-medium tracking-[0.25em] text-[#d7bf8e] uppercase">
                    Internal Operations
                  </span>
                </div>

                <h1 className="font-serif text-5xl leading-[1.05] tracking-tight">
                  Keep the
                  <br />
                  kitchen
                  <br />
                  <span className="text-[#d8bd83]">moving.</span>
                </h1>

                <p className="mt-7 max-w-sm text-sm leading-6 text-white/60">
                  Manage orders, inventory, production, staff and daily kitchen
                  operations from one place.
                </p>

                {/* System status indicator */}
                <div className="mt-10 flex items-center gap-3">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#9bc29d] opacity-60 motion-reduce:animate-none" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#9bc29d]" />
                  </span>
                  <span className="text-xs text-white/50">
                    Operations system online
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ── Login form panel ───────────────────────────────────────── */}
          <section
            className="flex min-h-[650px] flex-col justify-center bg-[#fbfaf6] px-7 py-10 sm:px-12 lg:px-16"
            aria-label="Sign in"
          >
            {/* Mobile-only brand header */}
            <div className="mb-12 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#294d33] text-white">
                <FernleafIcon />
              </div>
              <div>
                <p className="text-sm font-bold text-[#294d33]">Fernleaf</p>
                <p className="text-[10px] tracking-[0.2em] text-[#8c8c80] uppercase">
                  Kitchen
                </p>
              </div>
            </div>

            <div className="mx-auto w-full max-w-sm">
              {/* Section heading */}
              <div className="mb-9">
                <p className="mb-3 text-[10px] font-semibold tracking-[0.25em] text-[#9b7b45] uppercase">
                  Welcome back
                </p>
                <h2 className="font-serif text-4xl tracking-tight text-[#26352a]">
                  Sign in to
                  <br />
                  your workspace.
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#7c8176]">
                  Access the Fernleaf Kitchen operations panel.
                </p>
              </div>

              {/* Login form */}
              <form
                id="login-form"
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="space-y-5"
              >
                {/* Server-level error */}
                {serverError && (
                  <div
                    role="alert"
                    className="flex gap-3 rounded-xl border border-[#e8caca] bg-[#fff5f4] px-4 py-3 text-sm text-[#a34747]"
                  >
                    <span className="mt-0.5 shrink-0" aria-hidden="true">
                      !
                    </span>
                    <span>{serverError}</span>
                  </div>
                )}

                {/* Email */}
                <div className="space-y-2">
                  <label
                    htmlFor="login-email"
                    className="block text-xs font-semibold tracking-wide text-[#4c594f]"
                  >
                    Email address
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@fernleaf.com"
                    aria-invalid={errors.email ? true : undefined}
                    aria-describedby={
                      errors.email ? "login-email-error" : undefined
                    }
                    className="h-12 w-full rounded-xl border border-[#d8d5ca] bg-white px-4 text-sm text-[#26352a] outline-none transition-all placeholder:text-[#aaa99f] hover:border-[#b7b6aa] focus:border-[#315d3c] focus:ring-4 focus:ring-[#315d3c]/10 aria-invalid:border-[#bd6a6a] aria-invalid:focus:ring-[#bd6a6a]/10"
                    {...register("email")}
                  />
                  {errors.email && (
                    <p
                      id="login-email-error"
                      className="text-xs text-[#b24e4e]"
                      role="alert"
                    >
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label
                    htmlFor="login-password"
                    className="text-xs font-semibold tracking-wide text-[#4c594f]"
                  >
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    aria-invalid={errors.password ? true : undefined}
                    aria-describedby={
                      errors.password ? "login-password-error" : undefined
                    }
                    className="h-12 w-full rounded-xl border border-[#d8d5ca] bg-white px-4 text-sm text-[#26352a] outline-none transition-all placeholder:text-[#aaa99f] hover:border-[#b7b6aa] focus:border-[#315d3c] focus:ring-4 focus:ring-[#315d3c]/10 aria-invalid:border-[#bd6a6a] aria-invalid:focus:ring-[#bd6a6a]/10"
                    {...register("password")}
                  />
                  {errors.password && (
                    <p
                      id="login-password-error"
                      className="text-xs text-[#b24e4e]"
                      role="alert"
                    >
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <button
                  id="login-submit"
                  type="submit"
                  disabled={isSubmitting}
                  className="group relative mt-3 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[#294d33] text-sm font-semibold text-white shadow-[0_8px_24px_rgba(41,77,51,0.18)] transition-all hover:bg-[#213f29] hover:shadow-[0_10px_28px_rgba(41,77,51,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315d3c] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {/* Shimmer sweep */}
                  <span
                    className="absolute inset-y-0 -left-full w-1/2 skew-x-[-20deg] bg-white/10 transition-all duration-500 group-hover:left-[120%] motion-reduce:hidden"
                    aria-hidden="true"
                  />
                  {isSubmitting && (
                    <span className="relative h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  )}
                  <span className="relative">
                    {isSubmitting ? "Signing in…" : "Enter workspace"}
                  </span>
                  {!isSubmitting && (
                    <span
                      className="relative ml-1 transition-transform group-hover:translate-x-1 motion-reduce:transition-none"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  )}
                </button>
              </form>

              {/* Page footer */}
              <div className="mt-10 border-t border-[#e4e1d8] pt-5">
                <div className="flex items-center justify-between text-[10px] tracking-wide text-[#99998e]">
                  <span>FERNLEAF KITCHEN</span>
                  <span>INTERNAL USE ONLY</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </AppBackground>
  );
}
