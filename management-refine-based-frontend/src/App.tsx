import { Refine } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

import routerProvider, {
  DocumentTitleHandler,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { BookOpen, Home } from "lucide-react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router";
import "./App.css";
import { Toaster } from "./components/refine-ui/notification/toaster.tsx";
import { useNotificationProvider } from "./components/refine-ui/notification/use-notification-provider.tsx";
import { ThemeProvider } from "./components/refine-ui/theme/theme-provider.tsx";
import { dataProvider } from "./providers/data.ts";
import { authProvider } from "./providers/auth.ts";
import { Dashboard } from "./pages/dashboard.tsx";
import { Layout } from "./components/refine-ui/layout/layout.tsx";
import { SubjectsList } from "./pages/subjects/list.tsx";
import ClassesList from "./pages/classes/list.tsx";
import { SubjectsCreate } from "./pages/subjects/create.tsx";
import ClassesCreate from "./pages/classes/create.tsx";
import QuizzesList from "./pages/classes/quizzes/list.tsx";
import QuizzesCreate from "./pages/classes/quizzes/create.tsx";
import LoginPage from "./pages/login.tsx";
import RegisterPage from "./pages/register.tsx";
import { useIsAuthenticated } from "@refinedev/core";
import { Loader2 } from "lucide-react";

function ProtectedLayout() {
  const { isLoading, data } = useIsAuthenticated();

  if (isLoading) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.authenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ThemeProvider>
          <DevtoolsProvider>
            <Refine
              authProvider={authProvider}
              dataProvider={dataProvider}
              notificationProvider={useNotificationProvider()}
              routerProvider={routerProvider}
              options={{
                syncWithLocation: true,
                warnWhenUnsavedChanges: true,
                projectId: "DaE1hZ-LjRhfz-xyTLa3",
              }}
              resources={[
                {
                  name: "dashboard",
                  list: "/",
                  meta: {
                    label: "Dashboard",
                    icon: <Home />
                  },
                },
                {
                  name: "subjects",
                  list: "/subjects",
                  create: "/subjects/create",
                  meta: {
                    label: "Subjects",
                    icon: <BookOpen />
                  },
                },
                {
                  name: "classes",
                  list: "/classes",
                  create: "/classes/create",
                  meta: {
                    label: "Classes",
                    icon: <BookOpen />
                  }

                }
              ]}
            >
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route element={<ProtectedLayout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="subjects">
                    <Route index element={<SubjectsList />} />
                    <Route path="create" element={<SubjectsCreate />} />
                  </Route>
                  <Route path="classes">
                    <Route index element={<ClassesList />} />
                    <Route path="create" element={<ClassesCreate />} />
                    <Route path=":classId/quizzes">
                      <Route index element={<QuizzesList />} />
                      <Route path="create" element={<QuizzesCreate />} />
                    </Route>
                  </Route>
                </Route>
              </Routes>
              <Toaster />
              <RefineKbar />
              <UnsavedChangesNotifier />
              <DocumentTitleHandler />
            </Refine>
            <DevtoolsPanel />
          </DevtoolsProvider>
        </ThemeProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
