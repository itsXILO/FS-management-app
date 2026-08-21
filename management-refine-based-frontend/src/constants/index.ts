import { GraduationCap, School } from "lucide-react";

export const USER_ROLES = {
  STUDENT: "student",
  TEACHER: "teacher",
  ADMIN: "admin",
};

export const ROLE_OPTIONS = [
  {
    value: USER_ROLES.STUDENT,
    label: "Student",
    icon: GraduationCap,
  },
  {
    value: USER_ROLES.TEACHER,
    label: "Teacher",
    icon: School,
  },
];

export const DEPARTMENTS = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Biology",
  "English",
  "History",
  "Geography",
  "Economics",
  "Business Administration",
  "Engineering",
  "Psychology",
  "Sociology",
  "Political Science",
  "Philosophy",
  "Education",
  "Fine Arts",
  "Music",
  "Physical Education",
  "Law",
] as const;

export const DEPARTMENT_OPTIONS = DEPARTMENTS.map((dept) => ({
  value: dept,
  label: dept,
}));

export const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3MB in bytes
export const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const requireEnv = (key: keyof ImportMetaEnv): string => {
  const value = import.meta.env[key];

  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${key}. Add it to your .env file.`,
    );
  }

  return value;
};

export const CLOUDINARY_UPLOAD_URL = requireEnv("VITE_CLOUDINARY_UPLOAD_URL");
export const CLOUDINARY_CLOUD_NAME = requireEnv("VITE_CLOUDINARY_CLOUD_NAME");
export const BACKEND_BASE_URL = requireEnv("VITE_BACKEND_BASE_URL");

export const BASE_URL = requireEnv("VITE_API_URL");
export const ACCESS_TOKEN_KEY = requireEnv("VITE_ACCESS_TOKEN_KEY");
export const REFRESH_TOKEN_KEY = requireEnv("VITE_REFRESH_TOKEN_KEY");

export const REFRESH_TOKEN_URL = `${BASE_URL}/refresh-token`;

export const CLOUDINARY_UPLOAD_PRESET = requireEnv(
  "VITE_CLOUDINARY_UPLOAD_PRESET",
);