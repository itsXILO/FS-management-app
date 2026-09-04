import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useGetIdentity } from "@refinedev/core";
import {
  ClipboardList,
  Loader2,
  Plus,
  CalendarDays,
  Users,
  ChevronRight,
} from "lucide-react";

import { ListView } from "@/components/refine-ui/views/list-view";
import { Breadcrumb } from "@/components/refine-ui/layout/breadcrumb";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BACKEND_BASE_URL } from "@/constants";
import type { AttendanceSession, User } from "@/types/index";

function ClassAttendanceList() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const { data: identity } = useGetIdentity<User>();
  const isTeacher = identity?.role === "teacher" || identity?.role === "admin";

  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [className, setClassName] = useState("");

  const load = useCallback(async () => {
    if (!classId) return;
    try {
      setIsLoading(true);
      setError(null);
      const r = await fetch(
        `${BACKEND_BASE_URL}/api/classes/${classId}/attendance`,
        { credentials: "include" }
      );
      if (!r.ok) throw new Error();
      const p = await r.json() as { data?: AttendanceSession[] };
      setSessions(p.data ?? []);

      // Fetch class name for breadcrumb display
      const cr = await fetch(`${BACKEND_BASE_URL}/api/classes?limit=100`, {
        credentials: "include",
      });
      if (cr.ok) {
        const cp = await cr.json() as { data?: { id: number; name: string }[] };
        const found = cp.data?.find((c) => c.id === Number(classId));
        if (found) setClassName(found.name);
      }
    } catch {
      setError("Could not load attendance sessions.");
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  useEffect(() => { void load(); }, [load]);

  return (
    <ListView>
      <Breadcrumb />
      <h1 className="page-title">
        Attendance {className ? `— ${className}` : ""}
      </h1>
      <div className="intro-row">
        <p>
          {isTeacher
            ? "Manage attendance sessions for this class."
            : "View attendance sessions for this class."}
        </p>
        {isTeacher && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New Session
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p className="py-8 text-center text-sm text-destructive">{error}</p>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
          <ClipboardList className="h-10 w-10 opacity-40" />
          <p className="text-sm text-center max-w-xs">
            {isTeacher
              ? 'No sessions yet — click "New Session" to create one.'
              : "No attendance sessions have been created yet."}
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {sessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              isTeacher={isTeacher}
              onMark={() =>
                navigate(
                  `/classes/${classId}/attendance/${session.id}/mark`
                )
              }
            />
          ))}
        </div>
      )}

      {isTeacher && (
        <CreateSessionDialog
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            void load();
          }}
          classId={Number(classId)}
        />
      )}
    </ListView>
  );
}

function SessionRow({
  session,
  isTeacher,
  onMark,
}: {
  session: AttendanceSession;
  isTeacher: boolean;
  onMark: () => void;
}) {
  const date = new Date(session.date);
  const formattedDate = date.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const isMarked = (session.recordCount ?? 0) > 0;

  return (
    <div className="rounded-lg border p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <ClipboardList className="h-4 w-4 text-primary shrink-0" />
          <span className="font-semibold">{session.title}</span>
          <Badge variant={isMarked ? "default" : "secondary"}>
            {isMarked ? "Marked" : "Pending"}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {formattedDate}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {session.recordCount ?? 0} records
          </span>
        </div>
      </div>
      {isTeacher && (
        <Button variant="outline" size="sm" onClick={onMark}>
          {isMarked ? "Update" : "Mark Attendance"}
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

function CreateSessionDialog({
  open,
  onClose,
  onCreated,
  classId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  classId: number;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Session title is required.");
      return;
    }
    try {
      setIsSubmitting(true);
      setError(null);
      const r = await fetch(
        `${BACKEND_BASE_URL}/api/classes/${classId}/attendance`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ title: title.trim(), date }),
        }
      );
      if (!r.ok) {
        const p = await r.json() as { message?: string };
        throw new Error(p.message ?? "Failed to create session");
      }
      setTitle("");
      setDate(new Date().toISOString().split("T")[0]);
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create session");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Attendance Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="att-title">Session Title</Label>
            <Input
              id="att-title"
              placeholder="e.g. Lecture 5 — Introduction to Arrays"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="att-date">Date</Label>
            <Input
              id="att-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ClassAttendanceList;
