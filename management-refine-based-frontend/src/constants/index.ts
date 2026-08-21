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

const envOr = (key: keyof ImportMetaEnv, fallback = ""): string => {
  const value = import.meta.env[key];

  if (!value || value.trim() === "") {
    if (fallback) return fallback;

    console.warn(
      `Missing environment variable: ${key}. Add it to your .env file. ` +
        `See .env.example for the full list.`,
    );
    return "";
  }

  return value;
};

export const CLOUDINARY_CLOUD_NAME = envOr("VITE_CLOUDINARY_CLOUD_NAME");
export const CLOUDINARY_UPLOAD_PRESET = envOr("VITE_CLOUDINARY_UPLOAD_PRESET");

export const BACKEND_BASE_URL = envOr(
  "VITE_BACKEND_BASE_URL",
  "http://localhost:4000",
);