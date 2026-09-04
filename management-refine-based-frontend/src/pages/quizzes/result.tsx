import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Home,
  Loader2,
  Trophy,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { BACKEND_BASE_URL } from "@/constants";
import type { QuizAttemptResult } from "@/types/index";

function QuizResultPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(
          `${BACKEND_BASE_URL}/api/quizzes/${quizId}/attempt/result`,
          { credentials: "include" }
        );
        if (!r.ok) {
          const p = await r.json() as { message?: string };
          setError(p.message ?? "Could not load results.");
          setIsLoading(false);
          return;
        }
        const p = await r.json() as { data?: QuizAttemptResult };
        setResult(p.data ?? null);
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, [quizId]);

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center flex-col gap-4 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm">Loading your results…</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="rounded-xl border bg-card p-8 max-w-md w-full text-center space-y-4">
          <p className="text-destructive font-semibold">{error ?? "Results not found."}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  const { attempt, quiz, answers } = result;
  const { percentage, score, totalQuestions } = attempt;
  const grade = getGrade(percentage);

  return (
    <div className="min-h-svh bg-background">
      <header className="sticky top-0 z-40 border-b bg-sidebar px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/classes/${quiz.classId}/quizzes`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{quiz.title}</p>
          <p className="text-xs text-muted-foreground truncate">{quiz.className}</p>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        {/* Score card */}
        <div
          className={cn(
            "rounded-2xl border p-8 text-center space-y-4",
            grade.bg
          )}
        >
          <div className="flex justify-center">
            <div className={cn("rounded-full p-4", grade.iconBg)}>
              <Trophy className={cn("h-10 w-10", grade.iconColor)} />
            </div>
          </div>
          <div>
            <p className={cn("text-5xl font-bold", grade.color)}>{percentage}%</p>
            <p className="text-lg font-semibold mt-1">{grade.label}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {score ?? 0} / {totalQuestions} correct
            </p>
          </div>
          <Progress value={percentage} className="h-3 rounded-full" />
        </div>

        {/* Meta info */}
        <div className="rounded-xl border bg-card p-4 grid grid-cols-2 gap-4 text-center text-sm">
          <div>
            <p className="text-muted-foreground">Started</p>
            <p className="font-medium">
              {new Date(attempt.startedAt).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Submitted</p>
            <p className="font-medium">
              {attempt.submittedAt
                ? new Date(attempt.submittedAt).toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </p>
          </div>
        </div>

        {/* Answer breakdown */}
        {answers.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-semibold text-base">Answer Breakdown</h2>
            {answers.map((ans, i) => (
              <div
                key={ans.questionId}
                className={cn(
                  "rounded-lg border p-4 space-y-2",
                  ans.isCorrect
                    ? "border-green-500/30 bg-green-500/5"
                    : "border-red-500/30 bg-red-500/5"
                )}
              >
                <div className="flex items-start gap-2">
                  {ans.isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="text-sm font-medium">
                      <span className="text-muted-foreground mr-1.5">Q{i + 1}.</span>
                      {ans.questionText}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          ans.isCorrect
                            ? "border-green-500/50 text-green-700 dark:text-green-400"
                            : "border-red-500/50 text-red-700 dark:text-red-400"
                        )}
                      >
                        Your answer: {ans.optionText}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => navigate(`/classes/${quiz.classId}/quizzes`)}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Quizzes
          </Button>
          <Button onClick={() => navigate("/")}>
            <Home className="h-4 w-4" />
            Dashboard
          </Button>
        </div>
      </main>
    </div>
  );
}

type Grade = {
  label: string;
  color: string;
  bg: string;
  iconBg: string;
  iconColor: string;
};

function getGrade(pct: number): Grade {
  if (pct >= 90)
    return {
      label: "Excellent!",
      color: "text-green-600 dark:text-green-400",
      bg: "bg-green-500/5 border-green-500/20",
      iconBg: "bg-green-500/15",
      iconColor: "text-green-600 dark:text-green-400",
    };
  if (pct >= 75)
    return {
      label: "Good Job!",
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-500/5 border-blue-500/20",
      iconBg: "bg-blue-500/15",
      iconColor: "text-blue-600 dark:text-blue-400",
    };
  if (pct >= 50)
    return {
      label: "Needs Improvement",
      color: "text-yellow-600 dark:text-yellow-400",
      bg: "bg-yellow-500/5 border-yellow-500/20",
      iconBg: "bg-yellow-500/15",
      iconColor: "text-yellow-600 dark:text-yellow-400",
    };
  return {
    label: "Keep Practicing!",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/5 border-red-500/20",
    iconBg: "bg-red-500/15",
    iconColor: "text-red-600 dark:text-red-400",
  };
}

export default QuizResultPage;
