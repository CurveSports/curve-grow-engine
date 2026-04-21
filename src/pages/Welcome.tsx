import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ClipboardList, BarChart3, Sparkles } from "lucide-react";

const SLIDES_ORG = [
  {
    icon: Sparkles,
    eyebrow: "Welcome to Curve OS",
    title: "The revenue operating system for sports organizations.",
    body: "Curve OS gives you a clear view of your revenue engines, where you stack up against benchmarks, and the highest-leverage moves you can make next.",
  },
  {
    icon: ClipboardList,
    eyebrow: "Step 1 · The assessment",
    title: "Tell us about your organization.",
    body: "You'll work through a guided assessment covering your structure, players, revenue, retention, and operations. Most organizations finish in 15–20 minutes — your progress is saved automatically.",
  },
  {
    icon: BarChart3,
    eyebrow: "Step 2 · Your report",
    title: "See your engines, gaps, and opportunities.",
    body: "We score six revenue engines, surface the dollars on the table, and recommend the next steps your team should focus on. Your Curve consultant uses the same view.",
  },
];

const SLIDES_ADMIN = [
  {
    icon: Sparkles,
    eyebrow: "Welcome to Curve OS",
    title: "The Curve consultant workspace.",
    body: "From here you'll manage every client organization, invite primary contacts, and review the same revenue picture they see — all in one place.",
  },
  {
    icon: ClipboardList,
    eyebrow: "Onboarding clients",
    title: "Create an organization, invite the primary user.",
    body: "Each client starts with a primary contact who completes the assessment. Invitations are sent automatically with a sign-in link.",
  },
  {
    icon: BarChart3,
    eyebrow: "Reviewing performance",
    title: "Open any client's report instantly.",
    body: "Engine scores, opportunity ranges, and recommended next steps are calculated the moment a client submits their assessment.",
  },
];

export default function Welcome() {
  const navigate = useNavigate();
  const { role, profile } = useAuth();
  const { mark } = useOnboarding();
  const [step, setStep] = useState(0);

  const slides = useMemo(() => (role === "admin" ? SLIDES_ADMIN : SLIDES_ORG), [role]);
  const isLast = step === slides.length - 1;
  const Icon = slides[step].icon;

  const finish = async () => {
    await mark("welcomed_at");
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="curve-container py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center">
            <span className="text-background font-display font-bold text-sm">C</span>
          </div>
          <span className="font-display font-semibold text-lg tracking-tight">Curve OS</span>
        </div>
        <button
          onClick={finish}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Skip intro
        </button>
      </div>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl animate-fade-in">
          <div className="flex gap-2 mb-10">
            {slides.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all",
                  i <= step ? "bg-accent" : "bg-secondary"
                )}
              />
            ))}
          </div>

          <div className="flex items-center justify-center h-16 w-16 rounded-2xl bg-accent-soft mb-8">
            <Icon className="h-8 w-8 text-accent" />
          </div>

          <p className="curve-eyebrow mb-3">{slides[step].eyebrow}</p>
          <h1 className="text-4xl md:text-5xl font-display font-semibold mb-5 leading-tight tracking-tight">
            {slides[step].title}
          </h1>
          <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
            {slides[step].body}
          </p>

          {role !== "admin" && profile && step === 0 && (
            <p className="text-sm text-muted-foreground mb-10">
              Signed in as <span className="text-foreground font-medium">{profile.email}</span>.
            </p>
          )}

          <div className="flex items-center gap-3">
            {step > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
                className="h-12 px-6"
              >
                Back
              </Button>
            )}
            <Button
              type="button"
              onClick={() => (isLast ? finish() : setStep((s) => s + 1))}
              className="h-12 px-8 flex-1 text-base"
            >
              {isLast ? (role === "admin" ? "Go to admin dashboard" : "Start the assessment") : "Continue"}
            </Button>
          </div>
        </div>
      </main>

      <footer className="curve-container py-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} Curve Sports
      </footer>
    </div>
  );
}
