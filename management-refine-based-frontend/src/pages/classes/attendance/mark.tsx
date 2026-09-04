import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Save,
  UserCheck,
  XCircle,
} from "lucide-react";

import { ListView } from "@/components/refine-ui/views/list-view";
import { Breadcrumb } from "@/components/refine-ui/layout/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { BACKEND_BASE_URL } from "@/constants";
import type { AttendanceStudentRecord, AttendanceStatus, AttendanceSession } from "@/types/index";

type StatusOption = {
  value: AttendanceStatus;
  label: string;
  icon: React.ReactNode;
  className: string;
};

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: "present",
    label: "Present",
    icon: <CheckCircle2 className="h-4 w-4" />,
    className:
      "border-green-500 bg-green-500/10 text-green-700 dark:text-green-400",
  },
  {
    value: "late",
    label: "Late",
    icon: <Clock className="h-4 w-4" />,
    className:
      "border-yellow-500 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400",
  },
  {
    value: "absent",
    label: "Absent",
    icon: <XCircle className="h-4 w-4" />,
    className:
      "border-red-500 bg-red-500/10 text-red-700 dark:text-red-400",
  },
];

function MarkAttendancePage() {
  const { classId, sessionId } = useParams<{ classId: string; sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<AttendanceSession | null>(null);
  const [students, setStudents] = useState<AttendanceStudentRecord[]>([]);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const load = useCallback(async () => {
    if (!classId || !sessionId) return;
    try {
      setIsLoading(true);
      setError(null);
      const r = await fetch(
        `${BACKEND_BASE_URL}/api/classes/${classId}/attendance/${sessionId}`,
        { credentials: "include" }
      );
      if (!r.ok) throw new Error("Failed to load session");
      const p = await r.json() as {
        data?: { session: AttendanceSession; students: AttendanceStudentRecord[] };
      };
      const data = p.data!;
      setSession(data.session);
      setStudents(data.students);
      // Pre-fill existing statuses
      const initialStatuses: Record<string, AttendanceStatus> = {};
      data.students.forEach((s) => {
        if (s.status) initialStatuses[s.id] = s.status;
      });
      setStatuses(initialStatuses);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load session.");
    } finally {
      setIsLoading(false);
    }
  }, [classId, sessionId]);

  useEffect(() => { void load(); }, [load]);

  const setAll = (status: AttendanceStatus) => {
    const next: Record<string, AttendanceStatus> = {};
    students.forEach((s) => { next[s.id] = status; });
    setStatuses(next);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      setError(null);

      const records = students.map((s) => ({
        studentId: s.id,
        status: statuses[s.id] ?? "absent",
      }));

      const r = await fetch(
        `${BACKEND_BASE_URL}/api/classes/${classId}/attendance/${sessionId}/mark`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ records }),
        }
      );
      if (!r.ok) {
        const p = await r.json() as { message?: string };
        throw new Error(p.message ?? "Failed to save attendance");
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save attendance");
    } finally {
      setIsSaving(false);
    }
  };

  const presentCount = Object.values(statuses).filter((s) => s === "present").length;
  const lateCount = Object.values(statuses).filter((s) => s === "late").length;
  const absentCount = students.length - presentCount - lateCount;

  return (
    <ListView>
      <Breadcrumb />

      <div className="flex items-center gap-3 mb-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/classes/${classId}/attendance`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <h1 className="page-title flex items-center gap-2">
        <UserCheck className="h-6 w-6 text-primary" />
        Mark Attendance
      </h1>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-destructive">{error}</p>
      ) : (
        <>
          {/* Session info card */}
          {session && (
            <div className="rounded-xl border bg-card p-4 mb-6 flex flex-wrap items-center gap-4 justify-between">
              <div>
                <p className="font-semibold">{session.title}</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(session.date).toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {presentCount} Present
                </Badge>
                <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30">
                  <Clock className="h-3 w-3 mr-1" />
                  {lateCount} Late
                </Badge>
                <Badge className="bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30">
                  <XCircle className="h-3 w-3 mr-1" />
                  {absentCount} Absent
                </Badge>
              </div>
            </div>
          )}

          {/* Bulk actions */}
          <div className="flex gap-2 mb-4 flex-wrap">
            <span className="text-sm text-muted-foreground self-center">Mark all:</span>
            {STATUS_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant="outline"
                size="sm"
                onClick={() => setAll(opt.value)}
              >
                {opt.icon}
                {opt.label}
              </Button>
            ))}
          </div>

          {/* Student list */}
          {students.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No students enrolled in this class yet.
            </p>
          ) : (
            <div className="space-y-2">
              {students.map((student) => (
                <StudentAttendanceRow
                  key={student.id}
                  student={student}
                  status={statuses[student.id] ?? null}
                  onStatusChange={(status) =>
                    setStatuses((prev) => ({ ...prev, [student.id]: status }))
                  }
                />
              ))}
            </div>
          )}

          {/* Save bar */}
          <div className="sticky bottom-4 mt-6 flex items-center justify-between rounded-xl border bg-card p-3 shadow-md">
            <div className="text-sm text-muted-foreground">
              {students.length} student{students.length !== 1 ? "s" : ""}
            </div>
            <div className="flex items-center gap-3">
              {saveSuccess && (
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                  ✓ Saved
                </span>
              )}
              {error && (
                <span className="text-sm text-destructive">{error}</span>
              )}
              <Button onClick={handleSave} disabled={isSaving || students.length === 0}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Attendance
              </Button>
            </div>
          </div>
        </>
      )}
    </ListView>
  );
}

function StudentAttendanceRow({
  student,
  status,
  onStatusChange,
}: {
  student: AttendanceStudentRecord;
  status: AttendanceStatus | null;
  onStatusChange: (status: AttendanceStatus) => void;
}) {
  const initials = student.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="rounded-lg border bg-card p-3 flex items-center gap-3">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={student.image ?? undefined} alt={student.name} />
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{student.name}</p>
        <p className="text-xs text-muted-foreground truncate">{student.email}</p>
      </div>

      <div className="flex gap-1.5 shrink-0">
        {STATUS_OPTIONS.map((opt) => {
          const isSelected = status === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onStatusChange(opt.value)}
              title={opt.label}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-all duration-150",
                isSelected
                  ? opt.className
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              {opt.icon}
              <span className="hidden sm:inline">{opt.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default MarkAttendancePage;
