import { useCallback, useEffect, useState } from "react";
import { useGetIdentity } from "@refinedev/core";
import { useNavigate, useParams } from "react-router";
import { ArrowLeft, CalendarClock, ListChecks, Loader2, Plus, Timer, Trash2 } from "lucide-react";

import { ListView } from "@/components/refine-ui/views/list-view";
import { Breadcrumb } from "@/components/refine-ui/layout/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BACKEND_BASE_URL } from "@/constants";
import type { Quiz } from "@/types/index";

function formatDeadline(deadline: string): {
  text: string;
  isOpen: boolean;
} {
  const date = new Date(deadline);
  const isOpen = date.getTime() > Date.now();
  const text = date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return { text, isOpen };
}

function QuizzesList() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { data: identity } = useGetIdentity<{ role?: string }>();
  const isTeacher = identity?.role === "teacher";

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuizzes = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `${BACKEND_BASE_URL}/api/classes/${classId}/quizzes`,
        { credentials: "include" },
      );

      if (!response.ok) {
        throw new Error("Failed to load quizzes");
      }

      const payload = (await response.json()) as { data?: Quiz[] };
      setQuizzes(payload.data ?? []);
    } catch {
      setError("Could not load quizzes for this class.");
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    void loadQuizzes();
  }, [loadQuizzes]);

  return (
    <ListView>
      <Breadcrumb />
      <h1 className="page-title">Quizzes</h1>
      <div className="intro-row">
        <p>Tests attached to this class. Students can attempt each quiz once.</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/classes")}>
            <ArrowLeft /> All Classes
          </Button>
          {isTeacher && (
            <Button onClick={() => navigate(`/classes/${classId}/quizzes/create`)}>
              <Plus /> Create Quiz
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-destructive">{error}</p>
      ) : quizzes.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No quizzes yet{isTeacher ? " — create the first one!" : "."}
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {quizzes.map((quiz) => {
            const deadline = formatDeadline(quiz.deadline);
            return (
              <div
                key={quiz.id}
                className="rounded-lg border p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{quiz.title}</span>
                    <Badge variant={deadline.isOpen ? "default" : "secondary"}>
                      {deadline.isOpen ? "Open" : "Closed"}
                    </Badge>
                  </div>
                  {quiz.description && (
                    <p className="text-sm text-muted-foreground">
                      {quiz.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>{quiz.questionCount ?? 0} questions</span>
                    <span className="inline-flex items-center gap-1">
                      <Timer className="h-3.5 w-3.5" />
                      {quiz.durationMinutes} min
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      until {deadline.text}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  {!isTeacher && deadline.isOpen && (
                    <Button
                      size="sm"
                      onClick={() => navigate(`/quizzes/${quiz.id}/take`)}
                    >
                      Take Quiz
                    </Button>
                  )}
                  {!isTeacher && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/quizzes/${quiz.id}/result`)}
                    >
                      View Result
                    </Button>
                  )}
                  {isTeacher && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={async () => {
                        if (confirm("Delete this quiz?")) {
                          await fetch(`${BACKEND_BASE_URL}/api/quizzes/${quiz.id}`, { method: "DELETE", credentials: "include" });
                          await loadQuizzes();
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </ListView>
  );
}

export default QuizzesList;
export { QuizzesList };
