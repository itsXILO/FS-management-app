import * as z from "zod";

export const facultySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "teacher", "student"], {
    required_error: "Please select a role",
  }),
  department: z.string(),
  image: z.string().optional(),
  imageCldPubId: z.string().optional(),
});

export const subjectSchema = z.object({
  name: z
    .string()
    .min(3, "Subject name must be at least 3 characters")
    .max(255, "Subject name must be at most 255 characters"),
  code: z
    .string()
    .min(5, "Subject code must be at least 5 characters")
    .max(10, "Subject code must be at most 10 characters"),
  description: z
    .string()
    .min(5, "Subject description must be at least 5 characters")
    .max(255, "Subject description must be at most 255 characters"),
  department: z
    .string()
    .min(2, "Subject department must be at least 2 characters"),
});

const scheduleSchema = z.object({
  day: z.string().min(1, "Day is required"),
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().min(1, "End time is required"),
});

export const classSchema = z.object({
  name: z
    .string()
    .min(2, "Class name must be at least 2 characters")
    .max(50, "Class name must be at most 50 characters"),
  description: z
    .string({ required_error: "Description is required" })
    .min(5, "Description must be at least 5 characters"),
  subjectId: z.coerce
    .number({
      required_error: "Subject is required",
      invalid_type_error: "Subject is required",
    })
    .min(1, "Subject is required"),
  teacherId: z.string().min(1, "Teacher is required"),
  capacity: z.coerce
    .number({
      required_error: "Capacity is required",
      invalid_type_error: "Capacity is required",
    })
    .min(1, "Capacity must be at least 1"),
  status: z.enum(["active", "inactive"]),
  bannerUrl: z
    .string({ required_error: "Class banner is required" })
    .min(1, "Class banner is required"),
  bannerCldPubId: z
    .string({ required_error: "Banner reference is required" })
    .min(1, "Banner reference is required"),
  inviteCode: z.string().optional(),
  schedules: z.array(scheduleSchema).optional(),
});

export const enrollmentSchema = z.object({
  classId: z.coerce
    .number({
      required_error: "Class ID is required",
      invalid_type_error: "Class ID is required",
    })
    .min(1, "Class ID is required"),
  studentId: z.string().min(1, "Student ID is required"),
});

const quizOptionSchema = z.object({
  optionText: z
    .string()
    .min(1, "Option text is required")
    .max(500, "Option must be at most 500 characters"),
});

const quizQuestionSchema = z
  .object({
    questionText: z
      .string()
      .min(3, "Question must be at least 3 characters")
      .max(1000, "Question must be at most 1000 characters"),
    // min 2 options, max 4 options per question
    options: z
      .array(quizOptionSchema)
      .min(2, "Provide at least 2 options")
      .max(4, "Provide at most 4 options"),
    correctIndex: z.coerce.number().min(0, "Mark the correct option"),
  })
  .superRefine((question, ctx) => {
    if (question.correctIndex >= question.options.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["correctIndex"],
        message: "Mark the correct option",
      });
    }
  });

export const quizSchema = z.object({
  title: z
    .string()
    .min(3, "Quiz title must be at least 3 characters")
    .max(255, "Quiz title must be at most 255 characters"),
  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters")
    .optional(),
  durationMinutes: z.coerce
    .number({
      required_error: "Timer duration is required",
      invalid_type_error: "Timer duration is required",
    })
    .int("Use whole minutes")
    .min(1, "Timer must be at least 1 minute")
    .max(600, "Timer must be at most 600 minutes"),
  deadline: z
    .string()
    .min(1, "Deadline is required")
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: "Enter a valid date and time",
    })
    .refine((value) => Date.parse(value) > Date.now(), {
      message: "Deadline must be in the future",
    }),
  questions: z
    .array(quizQuestionSchema)
    .min(1, "Add at least one question")
    .max(100, "A quiz can have at most 100 questions"),
});

export type QuizFormValues = z.infer<typeof quizSchema>;
