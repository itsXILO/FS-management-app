import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Clock,
  Loader2,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { BACKEND_BASE_URL } from "@/constants";
import type { QuizQuestion, QuizOption } from "@/types/index";

type AttemptData = {
  attemptId: number;
  quiz: {
    id: number;
    title: string;
    description?: string | null;
    durationMinutes: number;
    deadline: string;
  };
  questions: (QuizQuestion & { options: Omit<QuizOption, "isCorrect">[] })[];
};

function TakeQuizPage() {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<"loading" | "error" | "quiz" | "submitting" | "done">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<AttemptData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({}); // questionId -> optionId
  const [timeLeft, setTimeLeft] = useState<number | null>(null); // seconds
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ---- Start attempt ---- */
  const startAttempt = useCallback(async () => {
    try {
      setPhase("loading");
      const r = await fetch(`${BACKEND_BASE_URL}/api/quizzes/${quizId}/attempt/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      const payload = await r.json() as { data?: AttemptData; message?: string };

      if (r.status === 409) {
        // Already started — check if already submitted
        const d = payload.data as { submittedAt?: string; attemptId?: number } | undefined;
        if (d?.submittedAt) {
          navigate(`/quizzes/${quizId}/result`, { replace: true });
          return;
        }
        setErrorMsg("You have already started this quiz but haven't submitted yet. Please refresh.");
        setPhase("error");
        return;
      }
      if (!r.ok) {
        setErrorMsg((payload as { message?: string }).message ?? "Could not start quiz.");
        setPhase("error");
        return;
      }

      const data = (payload as { data: AttemptData }).data;
      setAttempt(data);
      setTimeLeft(data.quiz.durationMinutes * 60);
      setPhase("quiz");
    } catch {
      setErrorMsg("Network error. Please try again.");
      setPhase("error");
    }
  }, [quizId, navigate]);

  useEffect(() => { void startAttempt(); }, [startAttempt]);

  /* ---- Countdown timer ---- */
  useEffect(() => {
    if (phase !== "quiz" || timeLeft === null) return;
    if (timeLeft <= 0) {
      void handleSubmit(true);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null || t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (timeLeft === 0 && phase === "quiz") {
      void handleSubmit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  /* ---- Submit ---- */
  const handleSubmit = async (autoSubmit = false) => {
    if (!attempt) return;
    if (!autoSubmit) {
      const unanswered = attempt.questions.filter((q) => answers[q.id] === undefined);
      if (unanswered.length > 0) {
        const ok = window.confirm(
          `You have ${unanswered.length} unanswered question(s). Submit anyway?`
        );
        if (!ok) return;
      }
    }

    if (timerRef.current) clearInterval(timerRef.current);
    setPhase("submitting");

    const answerPayload = attempt.questions
      .filter((q) => answers[q.id] !== undefined)
      .map((q) => ({ questionId: q.id, selectedOptionId: answers[q.id] }));

    try {
      const r = await fetch(`${BACKEND_BASE_URL}/api/quizzes/${quizId}/attempt/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ answers: answerPayload }),
      });
      if (!r.ok) {
        const p = await r.json() as { message?: string };
        setErrorMsg(p.message ?? "Submit failed.");
        setPhase("error");
        return;
      }
      setPhase("done");
      setTimeout(() => navigate(`/quizzes/${quizId}/result`, { replace: true }), 1200);
    } catch {
      setErrorMsg("Network error during submit.");
      setPhase("error");
    }
  };

  /* ---- Render ---- */
  if (phase === "loading") {
    return <FullPageLoader label="Starting quiz…" />;
  }

  if (phase === "submitting") {
    return <FullPageLoader label="Submitting answers…" />;
  }

  if (phase === "done") {
    return <FullPageLoader label="Calculating score…" />;
  }

  if (phase === "error") {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <div className="rounded-xl border bg-card p-8 max-w-md w-full text-center space-y-4">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <p className="font-semibold">{errorMsg}</p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (!attempt) return null;

  const questions = attempt.questions;
  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = Math.round((answeredCount / totalQuestions) * 100);

  return (
    <div className="min-h-svh flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-sidebar px-4 py-3 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{attempt.quiz.title}</p>
          <p className="text-xs text-muted-foreground">
            {answeredCount}/{totalQuestions} answered
          </p>
        </div>
        <TimerBadge seconds={timeLeft ?? 0} />
      </header>

      {/* Progress bar */}
      <Progress value={progress} className="h-1 rounded-none" />

      {/* Main content */}
      <main className="flex-1 container mx-auto max-w-2xl px-4 py-8">
        {/* Question navigator */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrentIndex(i)}
              className={cn(
                "h-8 w-8 rounded-md text-xs font-medium border transition-colors",
                i === currentIndex
                  ? "bg-primary text-primary-foreground border-primary"
                  : answers[q.id] !== undefined
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-muted border-border text-muted-foreground"
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>

        {/* Question card */}
        <div className="rounded-xl border bg-card p-6 space-y-5">
          <div className="flex items-start gap-3">
            <Badge variant="secondary" className="shrink-0 mt-0.5">
              Q{currentIndex + 1}
            </Badge>
            <p className="text-base font-medium leading-relaxed">
              {currentQuestion.questionText}
            </p>
          </div>

          {/* Options */}
          <div className="grid gap-2.5">
            {currentQuestion.options.map((opt) => {
              const isSelected = answers[currentQuestion.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() =>
                    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: opt.id }))
                  }
                  className={cn(
                    "w-full text-left px-4 py-3 rounded-lg border text-sm transition-all duration-150",
                    isSelected
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-background hover:bg-muted text-foreground"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={cn(
                        "h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center",
                        isSelected ? "border-primary" : "border-muted-foreground"
                      )}
                    >
                      {isSelected && (
                        <span className="h-2 w-2 rounded-full bg-primary block" />
                      )}
                    </span>
                    {opt.optionText}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
          >
            <ArrowLeft className="h-4 w-4" /> Previous
          </Button>

          {currentIndex < totalQuestions - 1 ? (
            <Button onClick={() => setCurrentIndex((i) => i + 1)}>
              Next <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => handleSubmit()}
              className="bg-primary"
            >
              <Send className="h-4 w-4" /> Submit Quiz
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}

function TimerBadge({ seconds }: { seconds: number }) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isUrgent = seconds <= 60;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-mono text-sm font-semibold",
        isUrgent
          ? "bg-destructive/10 border-destructive text-destructive animate-pulse"
          : "bg-muted border-border text-foreground"
      )}
    >
      <Clock className="h-3.5 w-3.5" />
      {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
    </div>
  );
}

function FullPageLoader({ label }: { label: string }) {
  return (
    <div className="flex min-h-svh items-center justify-center flex-col gap-4 text-muted-foreground">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export default TakeQuizPage;
