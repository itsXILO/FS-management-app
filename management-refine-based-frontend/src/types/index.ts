export type Subject = {
  id: number;
  name: string;
  code: string;
  description: string;
  department: string;
  createdAt?: string;
};

export type ListResponse<T = unknown> = {
  data?: T[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CreateResponse<T = unknown> = {
  data?: T;
};

export type GetOneResponse<T = unknown> = {
  data?: T;
};

declare global {
  interface CloudinaryUploadWidgetResults {
    event: string;
    info: {
      secure_url: string;
      public_id: string;
      delete_token?: string;
      resource_type: string;
      original_filename: string;
    };
  }

  interface CloudinaryWidget {
    open: () => void;
  }

  interface Window {
    cloudinary?: {
      createUploadWidget: (
        options: Record<string, unknown>,
        callback: (
          error: unknown,
          result: CloudinaryUploadWidgetResults
        ) => void
      ) => CloudinaryWidget;
    };
  }
}

export interface UploadWidgetValue {
  url: string;
  publicId: string;
}

export interface UploadWidgetProps {
  value?: UploadWidgetValue | null;
  onChange?: (value: UploadWidgetValue | null) => void;
  disabled?: boolean;
}

export enum UserRole {
  STUDENT = "student",
  TEACHER = "teacher",
  ADMIN = "admin",
}

export type User = {
  id: string;
  createdAt: string;
  updatedAt: string;
  email: string;
  name: string;
  role: UserRole;
  image?: string;
  imageCldPubId?: string;
  department?: string;
};

export type Schedule = {
  day: string;
  startTime: string;
  endTime: string;
};

export type Department = {
  id: number;
  name: string;
  description: string;
};

export type ClassDetails = {
  id: number;
  name: string;
  description: string;
  status: "active" | "inactive";
  capacity: number;
  courseCode: string;
  courseName: string;
  bannerUrl?: string;
  bannerCldPubId?: string;
  subject?: Subject;
  teacher?: User;
  department?: Department;
  schedules: Schedule[];
  inviteCode?: string;
};

export type SignUpPayload = {
  email: string;
  name: string;
  password: string;
  image?: string;
  imageCldPubId?: string;
  role: UserRole;
};

export type QuizOption = {
  id: number;
  optionText: string;
  position: number;
  isCorrect?: boolean;
};

export type QuizQuestion = {
  id: number;
  questionText: string;
  position: number;
  options: QuizOption[];
};

export type Quiz = {
  id: number;
  classId: number;
  title: string;
  description?: string | null;
  durationMinutes: number;
  deadline: string;
  createdAt: string;
  questionCount?: number;
};

export type QuizDetail = Quiz & {
  isOwner: boolean;
  questions: QuizQuestion[];
};

export type AttendanceStatus = 'present' | 'absent' | 'late';

export type AttendanceSession = {
  id: number;
  classId: number;
  title: string;
  date: string;
  recordCount?: number;
  createdAt?: string;
};

export type AttendanceRecord = {
  id: number;
  sessionId: number;
  studentId: string;
  status: AttendanceStatus;
  markedAt: string;
};

export type AttendanceStudentRecord = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  status: AttendanceStatus | null;
  recordId: number | null;
};

export type AttendanceSummary = {
  classId: number;
  className: string;
  totalSessions: number;
  present: number;
  absent: number;
  late: number;
};

export type QuizAttemptResult = {
  attempt: {
    id: number;
    startedAt: string;
    submittedAt: string | null;
    score: number | null;
    totalQuestions: number;
    percentage: number;
  };
  quiz: {
    id: number;
    title: string;
    classId: number;
    className: string;
  };
  answers: {
    questionId: number;
    selectedOptionId: number;
    isCorrect: boolean;
    questionText: string;
    optionText: string;
  }[];
};
