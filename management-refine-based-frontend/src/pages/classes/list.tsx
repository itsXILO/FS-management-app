import { Breadcrumb } from "@/components/refine-ui/layout/breadcrumb";
import { ListView } from "@/components/refine-ui/views/list-view";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SelectTrigger, SelectValue } from "@/components/ui/select";
import { CreateButton } from "@/components/refine-ui/buttons/create";
import { useTable } from "@refinedev/react-table";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { useList } from "@refinedev/core";
import type { Subject, User } from "@/types/index";

type ClassRow = {
  id: number;
  bannerUrl?: string | null;
  name: string;
  status?: "active" | "inactive" | "archived";
  capacity: number;
  inviteCode?: string;
  subject?: {
    name: string;
  };
  teacher?: {
    name: string;
  };
};

function ClassesList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [selectedTeacher, setSelectedTeacher] = useState("all");

  const { result: subjectListResult } = useList<Subject>({
    resource: "subjects",
    pagination: {
      mode: "off",
    },
  });

  const { result: teacherListResult } = useList<User>({
    resource: "users",
    filters: [
      {
        field: "role",
        operator: "eq",
        value: "teacher",
      },
    ],
    pagination: {
      mode: "off",
    },
  });

  const subjects = subjectListResult.data ?? [];
  const teachers = teacherListResult.data ?? [];

  const searchFilter = searchQuery
    ? [
        {
          field: "name",
          operator: "contains" as const,
          value: searchQuery,
        },
      ]
    : [];

  const subjectFilter = selectedSubject !== "all"
    ? [
        {
          field: "subject",
          operator: "eq" as const,
          value: selectedSubject,
        },
      ]
    : [];

  const teacherFilter = selectedTeacher !== "all"
    ? [
        {
          field: "teacher",
          operator: "eq" as const,
          value: selectedTeacher,
        },
      ]
    : [];

  const classesTable = useTable<ClassRow>({
    columns: useMemo<ColumnDef<ClassRow>[]>(
      () => [
        {
          id: "bannerUrl",
          accessorKey: "bannerUrl",
          size: 120,
          header: () => <p className="column-title">Banner</p>,
          cell: ({ getValue }) => {
            const url = getValue<string | null | undefined>();

            if (!url) {
              return (
                <div className="h-10 w-16 rounded-md border bg-muted/40" />
              );
            }

            return (
              <img
                src={url}
                alt="Class banner"
                className="h-10 w-16 rounded-md object-cover"
              />
            );
          },
        },
        {
          id: "name",
          accessorKey: "name",
          size: 210,
          header: () => <p className="column-title">Class Name</p>,
          cell: ({ getValue }) => (
            <span className="text-foreground">{getValue<string>()}</span>
          ),
        },
        {
          id: "status",
          accessorKey: "status",
          size: 130,
          header: () => <p className="column-title">Status</p>,
          cell: ({ getValue }) => {
            const status = getValue<ClassRow["status"]>();
            const variant = status === "active" ? "default" : "secondary";

            return (
              <Badge variant={variant}>{status ?? "-"}</Badge>
            );
          },
        },
        {
          id: "subject",
          accessorKey: "subject.name",
          size: 190,
          header: () => <p className="column-title">Subject</p>,
          cell: ({ getValue }) => (
            <Badge variant="secondary">{getValue<string>() ?? "-"}</Badge>
          ),
        },
        {
          id: "teacher",
          accessorKey: "teacher.name",
          size: 180,
          header: () => <p className="column-title">Teacher</p>,
          cell: ({ getValue }) => (
            <span className="text-foreground">{getValue<string>() ?? "-"}</span>
          ),
        },
        {
          id: "capacity",
          accessorKey: "capacity",
          size: 120,
          header: () => <p className="column-title">Capacity</p>,
          cell: ({ getValue }) => (
            <span className="text-foreground">{getValue<number>() ?? "-"}</span>
          ),
        },
      ],
      []
    ),
    refineCoreProps: {
      resource: "classes",
      pagination: {
        pageSize: 10,
        mode: "server",
      },
      filters: {
        permanent: [...searchFilter, ...subjectFilter, ...teacherFilter],
      },
      sorters: {
        initial: [
          {
            field: "id",
            order: "desc",
          },
        ],
      },
    },
  });

  useEffect(() => {
    classesTable.refineCore.setCurrentPage(1);
  }, [searchQuery, selectedSubject, selectedTeacher, classesTable.refineCore]);

  return (
    <ListView>
      <Breadcrumb />
      <h1 className="page-title">Classes</h1>
      <div className="intro-row">
        <p>Browse and manage all classes in one place</p>
        <br />
        <div className="actions-row">
          <div className="relative w-full md:max-w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-primary" />
            <Input
              placeholder="Search by class name..."
              type="text"
              className="w-full pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <br />
          <div className="flex gap-2 w-full sm:w-auto">
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.name}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by teacher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teachers</SelectItem>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.name}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <CreateButton resource="classes" />
          </div>
        </div>
      </div>
      <DataTable table={classesTable} />
    </ListView>
  );
}

export default ClassesList;
