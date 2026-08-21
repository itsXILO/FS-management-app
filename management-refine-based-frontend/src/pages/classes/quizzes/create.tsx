import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useBack, useNotification } from "@refinedev/core";
import { useNavigate, useParams } from "react-router";
import { Loader2, Plus, Trash2, Timer, CalendarClock, ListChecks } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { CreateView } from "@/components/refine-ui/views/create-view";
import { Breadcrumb } from "@/components/refine-ui/layout/breadcrumb";
import { BACKEND_BASE_URL } from "@/constants";
import { quizSchema, type QuizFormValues } from "@/lib/schema";

const toLocalInputValue = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
};

const deadlinePresets = [
  { label: "+1 day", days: 1 },
  { label: "+2 days", days: 2 },
  { label: "+5 days", days: 5 },
  { label: "+1 week", days: 7 },
];

const durationPresets = [5, 10, 15, 30, 60];

const emptyQuestion = (): QuizFormValues["questions"][number] => ({
  questionText: "",
  options: [
    { optionText: "" },
    { optionText: "" },
  ],
  correctIndex: 0,
});

const QuizzesCreate = () => {
  const back = useBack();
  const navigate = useNavigate();
  const { open } = useNotification();
  const { classId } = useParams<{ classId: string }>();

  const form = useForm<QuizFormValues>({
    resolver: zodResolver(quizSchema),
    defaultValues: {
      title: "",
      description: "",
      durationMinutes: 10,
      deadline: toLocalInputValue(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)),
      questions: [emptyQuestion()],
    },
  });

  const {
    handleSubmit,
    control,
    formState: { isSubmitting },
    setValue,
  } = form;

  const questionsArray = useFieldArray({ control, name: "questions" });

  const onSubmit = async (values: QuizFormValues) => {
    try {
      const response = await fetch(
        `${BACKEND_BASE_URL}/api/classes/${classId}/quizzes`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: values.title,
            description: values.description || null,
            durationMinutes: values.durationMinutes,
            deadline: new Date(values.deadline).toISOString(),
            questions: values.questions.map((question) => ({
              questionText: question.questionText,
              options: question.options.map((option, index) => ({
                optionText: option.optionText,
                isCorrect: index === question.correctIndex,
              })),
            })),
          }),
        },
      );

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(payload?.message ?? "Failed to create the quiz");
      }

      open?.({
        type: "success",
        message: "Quiz created",
        description: `"${values.title}" is now attached to this class.`,
      });
      navigate(`/classes/${classId}/quizzes`);
    } catch (error) {
      open?.({
        type: "error",
        message: "Could not create quiz",
        description:
          error instanceof Error ? error.message : "Something went wrong",
      });
    }
  };

  return (
    <CreateView className="quiz-view">
      <Breadcrumb />

      <h1 className="page-title">Create a Quiz</h1>
      <div className="intro-row">
        <p>
          Add questions with 2–4 answer options, mark the correct one, set a
          timer and choose how long the quiz stays open.
        </p>
        <Button onClick={() => back()}>Go Back</Button>
      </div>

      <Separator />

      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="my-6 space-y-6">
          <Card className="w-full max-w-4xl mx-auto">
            <CardHeader className="relative z-10">
              <CardTitle className="text-2xl pb-0 font-bold text-gradient-orange">
                Quiz details
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="mt-6 space-y-5">
              <FormField
                control={control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Title <span className="text-orange-600">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Midterm Quiz" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What does this quiz cover?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <FormField
                  control={control}
                  name="durationMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <span className="inline-flex items-center gap-1.5">
                          <Timer className="h-4 w-4" /> Timer per attempt
                          (minutes){" "}
                          <span className="text-orange-600">*</span>
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={600} {...field} />
                      </FormControl>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {durationPresets.map((minutes) => (
                          <Button
                            key={minutes}
                            type="button"
                            variant="outline"
                            size="sm"
                            className={
                              Number(field.value) === minutes
                                ? "border-primary text-primary"
                                : undefined
                            }
                            onClick={() =>
                              setValue("durationMinutes", minutes, {
                                shouldValidate: true,
                              })
                            }
                          >
                            {minutes}m
                          </Button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={control}
                  name="deadline"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarClock className="h-4 w-4" /> Open until{" "}
                          <span className="text-orange-600">*</span>
                        </span>
                      </FormLabel>
                      <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {deadlinePresets.map((preset) => (
                          <Button
                            key={preset.label}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setValue(
                                "deadline",
                                toLocalInputValue(
                                  new Date(
                                    Date.now() +
                                      preset.days * 24 * 60 * 60 * 1000,
                                  ),
                                ),
                                { shouldValidate: true },
                              )
                            }
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="w-full max-w-4xl mx-auto">
            <CardHeader className="relative z-10">
              <CardTitle className="text-2xl pb-0 font-bold text-gradient-orange inline-flex items-center gap-2">
                <ListChecks className="h-6 w-6" /> Questions
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="mt-6 space-y-6">
              {questionsArray.fields.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No questions yet — add your first question below.
                </p>
              )}

              {questionsArray.fields.map((questionField, questionIndex) => (
                <QuestionCard
                  key={questionField.id}
                  control={control}
                  questionIndex={questionIndex}
                  onRemove={() => questionsArray.remove(questionIndex)}
                  canRemove={questionsArray.fields.length > 1}
                />
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => questionsArray.append(emptyQuestion())}
                disabled={questionsArray.fields.length >= 100}
              >
                <Plus /> Add Question
              </Button>
            </CardContent>
          </Card>

          <div className="max-w-4xl mx-auto">
            <Button type="submit" size="lg" className="w-full">
              {isSubmitting ? (
                <div className="flex gap-1">
                  <span>Creating Quiz...</span>
                  <Loader2 className="inline-block ml-2 animate-spin" />
                </div>
              ) : (
                "Create Quiz"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </CreateView>
  );
};

type QuestionCardProps = {
  control: ReturnType<typeof useForm<QuizFormValues>>["control"];
  questionIndex: number;
  onRemove: () => void;
  canRemove: boolean;
};

function QuestionCard({
  control,
  questionIndex,
  onRemove,
  canRemove,
}: QuestionCardProps) {
  const optionsArray = useFieldArray({
    control,
    name: `questions.${questionIndex}.options` as const,
  });

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold">
          Question {questionIndex + 1}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label="Remove question"
        >
          <Trash2 className="text-destructive" />
        </Button>
      </div>

      <FormField
        control={control}
        name={`questions.${questionIndex}.questionText` as const}
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Textarea
                placeholder="e.g. Which data structure uses FIFO ordering?"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name={`questions.${questionIndex}.correctIndex` as const}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Answer options (mark the correct one)</FormLabel>
            <FormControl>
              <RadioGroup
                value={String(field.value ?? 0)}
                onValueChange={(value) => field.onChange(Number(value))}
                className="space-y-2"
              >
                {optionsArray.fields.map((optionField, optionIndex) => (
                  <div
                    key={optionField.id}
                    className="flex items-center gap-3"
                  >
                    <RadioGroupItem
                      value={String(optionIndex)}
                      id={`q-${questionIndex}-opt-${optionIndex}`}
                    />
                    <Label
                      htmlFor={`q-${questionIndex}-opt-${optionIndex}`}
                      className="sr-only"
                    >
                      Mark option {optionIndex + 1} correct
                    </Label>
                    <FormField
                      control={control}
                      name={`questions.${questionIndex}.options.${optionIndex}.optionText` as const}
                      render={({ field: optionTextField }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <Input
                              placeholder={`Option ${optionIndex + 1}`}
                              {...optionTextField}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => optionsArray.remove(optionIndex)}
                      disabled={optionsArray.fields.length <= 2}
                      aria-label="Remove option"
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                {optionsArray.fields.length}/4 options (min 2)
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => optionsArray.append({ optionText: "" })}
                disabled={optionsArray.fields.length >= 4}
              >
                <Plus /> Add Option
              </Button>
            </div>
          </FormItem>
        )}
      />
    </div>
  );
}

export default QuizzesCreate;
export { QuizzesCreate };
