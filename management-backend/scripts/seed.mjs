#!/usr/bin/env node
// seed.mjs — seeds the classroom app with realistic dummy data
// Run: node management-backend/scripts/seed.mjs

const BASE = "http://localhost:4000";

const get = (obj, path) =>
  path.split(".").reduce((o, k) => (o ?? {})[k], obj);

async function api(jar, method, path, body) {
  const headers = {
    "Content-Type": "application/json",
    "Origin": "http://localhost:5173",
  };
  if (jar.cookie) headers["Cookie"] = jar.cookie;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: "follow",
  });

  // Persist Set-Cookie headers
  const setCookie = res.headers.getSetCookie?.() ?? [];
  if (setCookie.length > 0) {
    const existing = jar.cookie ?? "";
    const incoming = setCookie.map((c) => c.split(";")[0]).join("; ");
    jar.cookie = existing ? `${existing}; ${incoming}` : incoming;
  }

  try { return await res.json(); } catch { return {}; }
}

const post = (jar, path, body) => api(jar, "POST", path, body);
const get_ = (jar, path)       => api(jar, "GET",  path);

async function register(email, password, name, role) {
  const jar = {};
  await post(jar, "/api/auth/sign-up/email", { email, password, name, role });
  const r = await post(jar, "/api/auth/sign-in/email", { email, password });
  const id = r?.user?.id;
  if (!id) throw new Error(`Could not register ${email} — ${JSON.stringify(r)}`);
  return { jar, id };
}

const mkSession = (jar, classId, title, date) =>
  post(jar, `/api/classes/${classId}/attendance`, { title, date });

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

async function main() {
  console.log("━".repeat(56));
  console.log("  🌱  Seeding classroom app at", BASE);
  console.log("━".repeat(56));

  // ── 1. Register users ──────────────────────────────────────
  console.log("\n[1/6] Registering users…");
  const PASS_T = "Teacher@123", PASS_S = "Student@123";

  const alice  = await register("alice.johnson@school.edu",   PASS_T, "Alice Johnson",  "teacher");
  const bob    = await register("bob.smith@school.edu",       PASS_T, "Bob Smith",      "teacher");
  const charlie= await register("charlie.brown@student.edu",  PASS_S, "Charlie Brown",  "student");
  const diana  = await register("diana.prince@student.edu",   PASS_S, "Diana Prince",   "student");
  const ethan  = await register("ethan.hunt@student.edu",     PASS_S, "Ethan Hunt",     "student");
  const fiona  = await register("fiona.green@student.edu",    PASS_S, "Fiona Green",    "student");

  console.log(`  Teachers : ${alice.id}  ${bob.id}`);
  console.log(`  Students : ${charlie.id}  ${diana.id}  ${ethan.id}  ${fiona.id}`);

  // ── 2. Create subjects ─────────────────────────────────────
  console.log("\n[2/6] Creating subjects…");
  const subj1 = await post(alice.jar, "/api/subjects", {
    name: "Introduction to Computer Science", code: "CS-101",
    description: "Foundational CS concepts — algorithms, data types, problem solving.",
    department: "Computer Science",
  });
  const subj2 = await post(bob.jar, "/api/subjects", {
    name: "Calculus and Linear Algebra", code: "MATH-201",
    description: "Differential calculus, integration, matrices and vector spaces.",
    department: "Mathematics",
  });
  const subj3 = await post(alice.jar, "/api/subjects", {
    name: "Web Development Fundamentals", code: "CS-202",
    description: "HTML, CSS, JavaScript, REST APIs and basic full-stack concepts.",
    department: "Computer Science",
  });

  const s1id = subj1?.data?.id, s2id = subj2?.data?.id, s3id = subj3?.data?.id;
  console.log(`  Subject IDs: ${s1id}  ${s2id}  ${s3id}`);

  // ── 3. Create classes ──────────────────────────────────────
  console.log("\n[3/6] Creating classes…");
  const cls1 = await post(alice.jar, "/api/classes", {
    name: "Intro to Programming — Batch A",
    description: "Learn programming fundamentals using Python. Covers variables, loops, functions, and basic data structures.",
    subjectId: s1id, teacherId: alice.id, capacity: 30, status: "active",
    bannerUrl: "https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800",
    bannerCldPubId: "seed/cs101",
    schedules: [
      { day: "Monday",    startTime: "09:00", endTime: "10:30" },
      { day: "Wednesday", startTime: "09:00", endTime: "10:30" },
    ],
  });
  const cls2 = await post(bob.jar, "/api/classes", {
    name: "Calculus 101 — Morning Section",
    description: "Core differential and integral calculus. Weekly problem sets and bi-weekly quizzes.",
    subjectId: s2id, teacherId: bob.id, capacity: 25, status: "active",
    bannerUrl: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800",
    bannerCldPubId: "seed/math201",
    schedules: [
      { day: "Tuesday",  startTime: "11:00", endTime: "12:30" },
      { day: "Thursday", startTime: "11:00", endTime: "12:30" },
    ],
  });
  const cls3 = await post(alice.jar, "/api/classes", {
    name: "Web Dev — Full Stack Track",
    description: "Hands-on web development from HTML/CSS to building REST APIs with Node.js.",
    subjectId: s3id, teacherId: alice.id, capacity: 20, status: "active",
    bannerUrl: "https://images.unsplash.com/photo-1547658719-da2b51169166?w=800",
    bannerCldPubId: "seed/webdev",
    schedules: [{ day: "Friday", startTime: "14:00", endTime: "17:00" }],
  });

  const c1 = cls1?.data?.id, c2 = cls2?.data?.id, c3 = cls3?.data?.id;
  console.log(`  Class IDs: ${c1}  ${c2}  ${c3}`);

  // ── 4. Enroll students ─────────────────────────────────────
  console.log("\n[4/6] Enrolling students…");
  const enroll = (tJar, classId, studentId) =>
    post(tJar, `/api/classes/${classId}/students`, { studentId });

  // CS (cls1): all 4 students
  for (const s of [charlie, diana, ethan, fiona])
    await enroll(alice.jar, c1, s.id);

  // Math (cls2): charlie, diana, fiona
  for (const s of [charlie, diana, fiona])
    await enroll(bob.jar, c2, s.id);

  // Web Dev (cls3): diana, ethan, fiona
  for (const s of [diana, ethan, fiona])
    await enroll(alice.jar, c3, s.id);

  console.log("  Enrollment complete.");

  // ── 5. Create quizzes ──────────────────────────────────────
  console.log("\n[5/6] Creating quizzes…");
  const DEADLINE = "2027-12-31T23:59:00.000Z";

  const quiz1 = await post(alice.jar, `/api/classes/${c1}/quizzes`, {
    title: "Python Basics — Week 2 Check",
    description: "Covers variables, data types, conditionals, and loops.",
    durationMinutes: 20, deadline: DEADLINE,
    questions: [
      { questionText: "Which keyword defines a function in Python?",
        options: [{ optionText:"function",isCorrect:false},{ optionText:"def",isCorrect:true},{ optionText:"fn",isCorrect:false},{ optionText:"define",isCorrect:false}] },
      { questionText: "What is the output of print(type(3.14))?",
        options: [{ optionText:"<class 'int'>",isCorrect:false},{ optionText:"<class 'float'>",isCorrect:true},{ optionText:"<class 'str'>",isCorrect:false},{ optionText:"<class 'num'>",isCorrect:false}] },
      { questionText: "Which of the following is a mutable data type in Python?",
        options: [{ optionText:"tuple",isCorrect:false},{ optionText:"string",isCorrect:false},{ optionText:"list",isCorrect:true},{ optionText:"int",isCorrect:false}] },
      { questionText: "What does range(1, 5) produce?",
        options: [{ optionText:"1,2,3,4,5",isCorrect:false},{ optionText:"1,2,3,4",isCorrect:true},{ optionText:"0,1,2,3,4",isCorrect:false},{ optionText:"2,3,4",isCorrect:false}] },
      { questionText: "Which operator is used for integer division in Python 3?",
        options: [{ optionText:"/",isCorrect:false},{ optionText:"//",isCorrect:true},{ optionText:"%",isCorrect:false},{ optionText:"**",isCorrect:false}] },
    ],
  });

  const quiz2 = await post(bob.jar, `/api/classes/${c2}/quizzes`, {
    title: "Derivatives — Unit 1 Quiz",
    description: "Limits, first principles, and basic differentiation rules.",
    durationMinutes: 30, deadline: DEADLINE,
    questions: [
      { questionText: "What is the derivative of x² with respect to x?",
        options: [{ optionText:"x",isCorrect:false},{ optionText:"2x",isCorrect:true},{ optionText:"x²",isCorrect:false},{ optionText:"2",isCorrect:false}] },
      { questionText: "What is the derivative of a constant?",
        options: [{ optionText:"The constant itself",isCorrect:false},{ optionText:"1",isCorrect:false},{ optionText:"0",isCorrect:true},{ optionText:"Undefined",isCorrect:false}] },
      { questionText: "Which rule applies to the derivative of a product of two functions?",
        options: [{ optionText:"Chain rule",isCorrect:false},{ optionText:"Product rule",isCorrect:true},{ optionText:"Quotient rule",isCorrect:false},{ optionText:"Sum rule",isCorrect:false}] },
      { questionText: "What is lim(x→0) of sin(x)/x?",
        options: [{ optionText:"0",isCorrect:false},{ optionText:"Undefined",isCorrect:false},{ optionText:"∞",isCorrect:false},{ optionText:"1",isCorrect:true}] },
    ],
  });

  const quiz3 = await post(alice.jar, `/api/classes/${c3}/quizzes`, {
    title: "HTML & CSS Fundamentals Quiz",
    description: "Semantic HTML5, CSS selectors, box model, and flexbox basics.",
    durationMinutes: 15, deadline: DEADLINE,
    questions: [
      { questionText: "Which HTML tag defines the largest heading?",
        options: [{ optionText:"<h6>",isCorrect:false},{ optionText:"<h1>",isCorrect:true},{ optionText:"<head>",isCorrect:false},{ optionText:"<title>",isCorrect:false}] },
      { questionText: "Which CSS property controls space between border and content?",
        options: [{ optionText:"margin",isCorrect:false},{ optionText:"spacing",isCorrect:false},{ optionText:"padding",isCorrect:true},{ optionText:"border",isCorrect:false}] },
      { questionText: "Which CSS value makes an element a flex container?",
        options: [{ optionText:"display: block",isCorrect:false},{ optionText:"display: flex",isCorrect:true},{ optionText:"display: grid",isCorrect:false},{ optionText:"display: inline",isCorrect:false}] },
    ],
  });

  const q1 = quiz1?.data?.id, q2 = quiz2?.data?.id, q3 = quiz3?.data?.id;
  console.log(`  Quiz IDs: ${q1}  ${q2}  ${q3}`);

  // ── 6. Attendance sessions ─────────────────────────────────
  console.log("\n[6/6] Attendance sessions + quiz attempts…");

  const mark = async (jar, classId, sessionId, records) => {
    await post(jar, `/api/classes/${classId}/attendance/${sessionId}/mark`, { records });
  };

  // CS class — 4 sessions
  const cs1 = await mkSession(alice.jar, c1, "Lecture 1 — Variables & Data Types", daysAgo(21));
  const cs2 = await mkSession(alice.jar, c1, "Lecture 2 — Control Flow",           daysAgo(14));
  const cs3 = await mkSession(alice.jar, c1, "Lecture 3 — Functions",              daysAgo(7));
  const cs4 = await mkSession(alice.jar, c1, "Lecture 4 — Lists & Dictionaries",   daysAgo(0));

  await mark(alice.jar, c1, cs1.data.id, [
    {studentId:charlie.id,status:"present"},{studentId:diana.id,status:"present"},
    {studentId:ethan.id,status:"present"},{studentId:fiona.id,status:"present"},
  ]);
  await mark(alice.jar, c1, cs2.data.id, [
    {studentId:charlie.id,status:"present"},{studentId:diana.id,status:"late"},
    {studentId:ethan.id,status:"absent"},{studentId:fiona.id,status:"present"},
  ]);
  await mark(alice.jar, c1, cs3.data.id, [
    {studentId:charlie.id,status:"present"},{studentId:diana.id,status:"present"},
    {studentId:ethan.id,status:"present"},{studentId:fiona.id,status:"late"},
  ]);
  await mark(alice.jar, c1, cs4.data.id, [
    {studentId:charlie.id,status:"present"},{studentId:diana.id,status:"absent"},
    {studentId:ethan.id,status:"late"},{studentId:fiona.id,status:"present"},
  ]);

  // Math class — 3 sessions
  const mt1 = await mkSession(bob.jar, c2, "Lecture 1 — Limits and Continuity",       daysAgo(18));
  const mt2 = await mkSession(bob.jar, c2, "Lecture 2 — Differentiation Rules",        daysAgo(11));
  const mt3 = await mkSession(bob.jar, c2, "Lecture 3 — Applications of Derivatives",  daysAgo(4));

  await mark(bob.jar, c2, mt1.data.id, [
    {studentId:charlie.id,status:"present"},{studentId:diana.id,status:"present"},{studentId:fiona.id,status:"absent"},
  ]);
  await mark(bob.jar, c2, mt2.data.id, [
    {studentId:charlie.id,status:"late"},{studentId:diana.id,status:"present"},{studentId:fiona.id,status:"present"},
  ]);
  await mark(bob.jar, c2, mt3.data.id, [
    {studentId:charlie.id,status:"present"},{studentId:diana.id,status:"present"},{studentId:fiona.id,status:"late"},
  ]);

  // Web Dev — 2 sessions
  const wd1 = await mkSession(alice.jar, c3, "Workshop 1 — HTML5 Semantic Structure", daysAgo(10));
  const wd2 = await mkSession(alice.jar, c3, "Workshop 2 — CSS Flexbox & Grid",       daysAgo(3));

  await mark(alice.jar, c3, wd1.data.id, [
    {studentId:diana.id,status:"present"},{studentId:ethan.id,status:"late"},{studentId:fiona.id,status:"present"},
  ]);
  await mark(alice.jar, c3, wd2.data.id, [
    {studentId:diana.id,status:"present"},{studentId:ethan.id,status:"present"},{studentId:fiona.id,status:"absent"},
  ]);

  // ── 7. Students take quizzes ───────────────────────────────
  const takeQuiz = async (sJar, quizId, answerPicks) => {
    // answerPicks: array of [questionIndex, optionIndex]
    const r = await post(sJar, `/api/quizzes/${quizId}/attempt/start`, {});
    if (!r?.data?.attemptId) return; // already attempted or not eligible
    const qs = r.data.questions;
    const answers = answerPicks.map(([qi, oi]) => ({
      questionId: qs[qi].id,
      selectedOptionId: qs[qi].options[oi].id,
    }));
    await post(sJar, `/api/quizzes/${quizId}/attempt/submit`, { answers });
  };

  // CS quiz (q1) — all 4 students
  await takeQuiz(charlie.jar, q1, [[0,1],[1,1],[2,2],[3,1],[4,1]]); // 5/5
  await takeQuiz(diana.jar,   q1, [[0,1],[1,1],[2,2],[3,1],[4,0]]); // 4/5
  await takeQuiz(ethan.jar,   q1, [[0,0],[1,1],[2,2],[3,2],[4,1]]); // 3/5
  await takeQuiz(fiona.jar,   q1, [[0,1],[1,1],[2,2],[3,1],[4,1]]); // 5/5

  // Math quiz (q2) — charlie, diana, fiona
  await takeQuiz(charlie.jar, q2, [[0,1],[1,2],[2,1],[3,3]]); // 4/4
  await takeQuiz(diana.jar,   q2, [[0,1],[1,2],[2,1],[3,3]]); // 4/4
  await takeQuiz(fiona.jar,   q2, [[0,0],[1,2],[2,0],[3,3]]); // 2/4

  // Web Dev quiz (q3) — diana, ethan, fiona
  await takeQuiz(diana.jar,  q3, [[0,1],[1,2],[2,1]]); // 3/3
  await takeQuiz(ethan.jar,  q3, [[0,1],[1,2],[2,1]]); // 3/3
  await takeQuiz(fiona.jar,  q3, [[0,0],[1,2],[2,1]]); // 2/3

  console.log("  Quiz attempts complete.");

  console.log("\n" + "━".repeat(56));
  console.log("  ✅  Seed complete!\n");
  console.log("  Teachers");
  console.log("    alice.johnson@school.edu  /  Teacher@123  (CS + Web Dev)");
  console.log("    bob.smith@school.edu      /  Teacher@123  (Math)");
  console.log("");
  console.log("  Students");
  console.log("    charlie.brown@student.edu  /  Student@123  (CS, Math)");
  console.log("    diana.prince@student.edu   /  Student@123  (CS, Math, Web Dev)");
  console.log("    ethan.hunt@student.edu     /  Student@123  (CS, Web Dev)");
  console.log("    fiona.green@student.edu    /  Student@123  (CS, Math, Web Dev)");
  console.log("━".repeat(56));
}

main().catch((e) => { console.error("❌ Seed failed:", e.message); process.exit(1); });
