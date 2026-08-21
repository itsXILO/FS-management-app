import { Breadcrumb } from "@/components/refine-ui/layout/breadcrumb";
import { ListView } from "@/components/refine-ui/views/list-view";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { SelectTrigger, SelectValue } from "@/components/ui/select";
import { DEPARTMENT_OPTIONS } from "@/constants/index.ts";
import { CreateButton } from "@/components/refine-ui/buttons/create";
import { useTable } from "@refinedev/react-table";
import { Subject } from "@/types/index.ts";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge.tsx";
import { useEffect } from "react";


export function SubjectsList() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  const departmentFilter = selectedDepartment !== "all" ? [
    {
      field: "department",
      operator: "eq" as const,
      value: selectedDepartment
    }
  ] : []
  const searchFilter = searchQuery ? [
    {
      field: "name",
      operator: "contains" as const,
      value: searchQuery
    }
  ] : [];
  const subjectTable = useTable<Subject>({
    columns: useMemo<ColumnDef<Subject>[]>(() => [
      {
        id: "code",
        accessorKey: "code",
        size:150,
        header:() => <p className="column-title ml-2">Code</p>,
        cell: ({getValue}) => <Badge>{getValue<string>()}</Badge>
      },
      {
        id: "name",
        accessorKey: "name",
        size:200,
        header:() => <p className="column-title">Name</p>,
        cell: ({getValue})=> <span className="text-foreground">{getValue<string>()}</span>,
        filterFn: 'includesString'
      },
      {
        id: "department",
        accessorKey: "department.name",
        size:150,
        header: () => <p className="column-title">Department</p>,
        cell: ({getValue}) => <Badge variant="secondary">{getValue<string>()}</Badge>
      },
      {
        id: "description",
        accessorKey: "description",
        size:300,
        header: () => <p className="column-title">Description</p>,
        cell: ({getValue}) => <span className="truncate line-clamp-2">{getValue<string>()}</span>
      }
    ], []),
    refineCoreProps: {  
      resource: "subjects",
      pagination: {
        pageSize: 10,
        mode: "server",
      },
      filters: {
        permanent: [...departmentFilter, ...searchFilter]
      },
      sorters: {
        initial:[
          {
            field: "id",
            order: "desc"
          }
        ]
      }
    }
  });

  useEffect(() => {
    subjectTable.refineCore.setCurrentPage(1);
  }, [searchQuery, selectedDepartment, subjectTable.refineCore]);

  return (
    <ListView>
      <Breadcrumb />
      <h1 className="page-title">Subjects</h1>
      <div className="intro-row">
        <p>Browse and manage all subjects in one place</p>
        <br />
        <div className="actions-row">
          <div className="relative w-full md:max-w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-primary" />
            <Input
              placeholder="Search by name..."
              type="text"
              className="w-full pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <br />
          <div className="flex gap-2 w-full sm:w-auto">
            <Select
              value={selectedDepartment}
              onValueChange={setSelectedDepartment}
              >    
                <SelectTrigger>
                    <SelectValue placeholder="Filter by department" />
                </SelectTrigger>

                <SelectContent>
                    <SelectItem value="all">
                        All Departments
                    </SelectItem>
                    {DEPARTMENT_OPTIONS.map((department) => (
                      <SelectItem
                        key={department.value}
                        value={department.value}>
                        {department.label}
                      </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <CreateButton />

          </div>
        </div>
      </div>
      <DataTable table={subjectTable} />
    </ListView>
  );
}

export default SubjectsList;
