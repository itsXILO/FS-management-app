

export function Dashboard() {
  return (
    <section className="flex flex-1 items-center justify-center py-10">
      <div className="w-full max-w-3xl rounded-xl border bg-card p-8 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">Dashboard</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">Welcome to Classroom Manager</h1>
        <p className="mt-3 text-base text-muted-foreground">
          Use the Subjects page to browse available subjects, search by name, filter
          by department, and navigate through paginated results.
        </p>
      </div>
    </section>
  );
}
