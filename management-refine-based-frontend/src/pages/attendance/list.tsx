import { useCallback, useEffect, useState } from "react";
import { useGetIdentity } from "@refinedev/core";
import { useNavigate } from "react-router";
import {
  ClipboardList,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  BookOpen,
} from "lucide-react";

import { ListView } from "@/components/refine-ui/views/list-view";
import { Breadcrumb } from "@/components/refine-ui/layout/breadcrumb";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BACKEND_BASE_URL } from "@/constants";
import type { AttendanceSummary, AttendanceSession, User } from "@/types/index";

type TeacherSession = AttendanceSession & { className: string; classId: number };

function AttendancePage() {
  const { data: identity } = useGetIdentity<User>();
  const isTeacher = identity?.role === "teacher";
  const isStudent = identity?.role === "student";

  if (isTeacher) return <TeacherAttendanceView />;
  if (isStudent) return <StudentAttendanceView />;
  return <AdminAttendanceView />;
}

/* ---------- Teacher View ---------- */
function TeacherAttendanceView() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<TeacherSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      // Fetch teacher's classes, then sessions for each
      const classesRes = await fetch(`${BACKEND_BASE_URL}/api/classes?limit=100`, {
        credentials: "include",
      });
      if (!classesRes.ok) throw new Error();
      const classesPayload = await classesRes.json() as { data?: { id: number; name: string }[] };
      const myClasses = classesPayload.data ?? [];

      const allSessions: TeacherSession[] = [];
      await Promise.all(
        myClasses.map(async (cls) => {
          const r = await fetch(`${BACKEND_BASE_URL}/api/classes/${cls.id}/attendance`, {
            credentials: "include",
          });
          if (!r.ok) return;
          const p = await r.json() as { data?: AttendanceSession[] };
          (p.data ?? []).forEach((s) =>
            allSessions.push({ ...s, className: cls.name, classId: cls.id })
          );
        })
      );

      allSessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setSessions(allSessions);
    } catch {
      setError("Could not load attendance sessions.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <ListView>
      <Breadcrumb />
      <h1 className="page-title">Attendance</h1>
      <div className="intro-row">
        <p>All attendance sessions across your classes.</p>
        <Button onClick={() => navigate("/classes")}>
          <ClipboardList className="h-4 w-4" />
          Manage via Classes
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-destructive">{error}</p>
      ) : sessions.length === 0 ? (
        <EmptyState message="No attendance sessions yet — open a class and create one!" />
      ) : (
        <div className="mt-4 space-y-3">
          {sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onManage={() => navigate(`/classes/${session.classId}/attendance`)}
            />
          ))}
        </div>
      )}
    </ListView>
  );
}

/* ---------- Student View ---------- */
function StudentAttendanceView() {
  const [summaries, setSummaries] = useState<AttendanceSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch(`${BACKEND_BASE_URL}/api/classes/my-attendance`, {
          credentials: "include",
        });
        if (!r.ok) throw new Error();
        const p = await r.json() as { data?: AttendanceSummary[] };
        setSummaries(p.data ?? []);
      } catch {
        setError("Could not load your attendance.");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  return (
    <ListView>
      <Breadcrumb />
      <h1 className="page-title">My Attendance</h1>
      <div className="intro-row">
        <p>Your attendance summary across all enrolled classes.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-destructive">{error}</p>
      ) : summaries.length === 0 ? (
        <EmptyState message="You're not enrolled in any classes yet." />
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {summaries.map((summary) => (
            <AttendanceSummaryCard key={summary.classId} summary={summary} />
          ))}
        </div>
      )}
    </ListView>
  );
}

/* ---------- Admin View ---------- */
function AdminAttendanceView() {
  const navigate = useNavigate();
  return (
    <ListView>
      <Breadcrumb />
      <h1 className="page-title">Attendance</h1>
      <div className="intro-row">
        <p>Manage attendance sessions via individual class pages.</p>
        <Button onClick={() => navigate("/classes")}>
          <BookOpen className="h-4 w-4" />
          Go to Classes
        </Button>
      </div>
      <EmptyState message="Select a class to view or manage its attendance sessions." />
    </ListView>
  );
}

/* ---------- Sub-components ---------- */
function SessionCard({
  session,
  onManage,
}: {
  session: TeacherSession;
  onManage: () => void;
}) {
  const date = new Date(session.date);
  const formattedDate = date.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="rounded-lg border p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold">{session.title}</span>
          <Badge variant="secondary">{session.className}</Badge>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>{formattedDate}</span>
          <span>{session.recordCount ?? 0} records</span>
        </div>
      </div>
      <Button variant="outline" size="sm" onClick={onManage}>
        Manage
      </Button>
    </div>
  );
}

function AttendanceSummaryCard({ summary }: { summary: AttendanceSummary }) {
  const { totalSessions, present, late } = summary;
  const attended = present + late;
  const percentage =
    totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;
  const color =
    percentage >= 75
      ? "text-green-600 dark:text-green-400"
      : percentage >= 50
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-destructive";

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold truncate">{summary.className}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {totalSessions} session{totalSessions !== 1 ? "s" : ""}
          </p>
        </div>
        <div className={`text-2xl font-bold ${color}`}>{percentage}%</div>
      </div>

      <Progress value={percentage} className="h-2" />

      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <StatPill icon={<CheckCircle2 className="h-3.5 w-3.5 text-green-500" />} label="Present" value={present} />
        <StatPill icon={<Clock className="h-3.5 w-3.5 text-yellow-500" />} label="Late" value={late} />
        <StatPill icon={<XCircle className="h-3.5 w-3.5 text-destructive" />} label="Absent" value={summary.absent} />
      </div>

      {totalSessions === 0 && (
        <p className="text-xs text-center text-muted-foreground">
          No sessions recorded yet
        </p>
      )}
      {totalSessions > 0 && (
        <div className={`flex items-center gap-1.5 text-xs font-medium ${color}`}>
          <TrendingUp className="h-3.5 w-3.5" />
          {percentage >= 75 ? "Good attendance" : percentage >= 50 ? "Needs improvement" : "At risk"}
        </div>
      )}
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-md bg-muted/50 py-1.5">
      {icon}
      <span className="font-semibold">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
      <ClipboardList className="h-10 w-10 opacity-40" />
      <p className="text-sm text-center max-w-xs">{message}</p>
    </div>
  );
}

export default AttendancePage;
