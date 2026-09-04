#!/usr/bin/env bash
# seed.sh — populates the classroom app with realistic dummy data
# Usage: bash scripts/seed.sh
# Requires: curl, jq

set -e
BASE="http://localhost:4000"
COOKIES_DIR="$(mktemp -d)"
trap 'rm -rf "$COOKIES_DIR"' EXIT

jq_get() { echo "$1" | jq -r "$2"; }

register() {
  local jar="$1" email="$2" pass="$3" name="$4" role="$5"
  curl -s -c "$jar" -X POST "$BASE/api/auth/sign-up/email" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$pass\",\"name\":\"$name\",\"role\":\"$role\"}" | jq -r '.user.id // empty'
}

login() {
  local jar="$1" email="$2" pass="$3"
  curl -s -c "$jar" -b "$jar" -X POST "$BASE/api/auth/sign-in/email" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"password\":\"$pass\"}" | jq -r '.user.id // empty'
}

post() {
  local jar="$1" path="$2" body="$3"
  curl -s -c "$jar" -b "$jar" -X POST "$BASE$path" \
    -H "Content-Type: application/json" \
    -d "$body"
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🌱 Seeding classroom app at $BASE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Register users ──────────────────────────────────────────
echo -e "\n[1/6] Registering users..."

T1_JAR="$COOKIES_DIR/teacher1.txt"; T2_JAR="$COOKIES_DIR/teacher2.txt"
S1_JAR="$COOKIES_DIR/s1.txt"; S2_JAR="$COOKIES_DIR/s2.txt"
S3_JAR="$COOKIES_DIR/s3.txt"; S4_JAR="$COOKIES_DIR/s4.txt"

T1_ID=$(register "$T1_JAR" "alice.johnson@school.edu" "Teacher@123" "Alice Johnson" "teacher")
T2_ID=$(register "$T2_JAR" "bob.smith@school.edu"    "Teacher@123" "Bob Smith"    "teacher")
S1_ID=$(register "$S1_JAR" "charlie.brown@student.edu" "Student@123" "Charlie Brown"  "student")
S2_ID=$(register "$S2_JAR" "diana.prince@student.edu"  "Student@123" "Diana Prince"   "student")
S3_ID=$(register "$S3_JAR" "ethan.hunt@student.edu"    "Student@123" "Ethan Hunt"     "student")
S4_ID=$(register "$S4_JAR" "fiona.green@student.edu"   "Student@123" "Fiona Green"    "student")

# re-login to get cookies (sign-up may not set session cookie in all setups)
T1_ID=$(login "$T1_JAR" "alice.johnson@school.edu" "Teacher@123")
T2_ID=$(login "$T2_JAR" "bob.smith@school.edu"     "Teacher@123")
S1_ID=$(login "$S1_JAR" "charlie.brown@student.edu" "Student@123")
S2_ID=$(login "$S2_JAR" "diana.prince@student.edu"  "Student@123")
S3_ID=$(login "$S3_JAR" "ethan.hunt@student.edu"    "Student@123")
S4_ID=$(login "$S4_JAR" "fiona.green@student.edu"   "Student@123")

echo "  Teacher 1 (Alice): $T1_ID"
echo "  Teacher 2 (Bob):   $T2_ID"
echo "  Students: $S1_ID $S2_ID $S3_ID $S4_ID"

# ── 2. Create subjects ─────────────────────────────────────────
echo -e "\n[2/6] Creating subjects..."

SUBJ1=$(post "$T1_JAR" "/api/subjects" \
  "{\"name\":\"Introduction to Computer Science\",\"code\":\"CS-101\",\"description\":\"Foundational CS concepts including algorithms, data types, and problem solving.\",\"department\":\"Computer Science\"}")
SUBJ1_ID=$(jq_get "$SUBJ1" '.data.id')

SUBJ2=$(post "$T2_JAR" "/api/subjects" \
  "{\"name\":\"Calculus and Linear Algebra\",\"code\":\"MATH-201\",\"description\":\"Differential calculus, integration, matrices, and vector spaces.\",\"department\":\"Mathematics\"}")
SUBJ2_ID=$(jq_get "$SUBJ2" '.data.id')

SUBJ3=$(post "$T1_JAR" "/api/subjects" \
  "{\"name\":\"Web Development Fundamentals\",\"code\":\"CS-202\",\"description\":\"HTML, CSS, JavaScript, REST APIs, and basic full-stack concepts.\",\"department\":\"Computer Science\"}")
SUBJ3_ID=$(jq_get "$SUBJ3" '.data.id')

echo "  Subject IDs: $SUBJ1_ID  $SUBJ2_ID  $SUBJ3_ID"

# ── 3. Create classes ──────────────────────────────────────────
echo -e "\n[3/6] Creating classes..."

TODAY=$(date +%Y-%m-%d)

CLS1=$(post "$T1_JAR" "/api/classes" \
  "{\"name\":\"Intro to Programming — Batch A\",\"description\":\"Learn the fundamentals of programming using Python. Covers variables, loops, functions, and basic data structures.\",\"subjectId\":$SUBJ1_ID,\"teacherId\":\"$T1_ID\",\"capacity\":30,\"status\":\"active\",\"bannerUrl\":\"https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=800\",\"bannerCldPubId\":\"seed/cs101\",\"schedules\":[{\"day\":\"Monday\",\"startTime\":\"09:00\",\"endTime\":\"10:30\"},{\"day\":\"Wednesday\",\"startTime\":\"09:00\",\"endTime\":\"10:30\"}]}")
CLS1_ID=$(jq_get "$CLS1" '.data.id')

CLS2=$(post "$T2_JAR" "/api/classes" \
  "{\"name\":\"Calculus 101 — Morning Section\",\"description\":\"Core differential and integral calculus. Weekly problem sets and bi-weekly quizzes.\",\"subjectId\":$SUBJ2_ID,\"teacherId\":\"$T2_ID\",\"capacity\":25,\"status\":\"active\",\"bannerUrl\":\"https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=800\",\"bannerCldPubId\":\"seed/math201\",\"schedules\":[{\"day\":\"Tuesday\",\"startTime\":\"11:00\",\"endTime\":\"12:30\"},{\"day\":\"Thursday\",\"startTime\":\"11:00\",\"endTime\":\"12:30\"}]}")
CLS2_ID=$(jq_get "$CLS2" '.data.id')

CLS3=$(post "$T1_JAR" "/api/classes" \
  "{\"name\":\"Web Dev — Full Stack Track\",\"description\":\"Hands-on web development from HTML/CSS to building REST APIs with Node.js.\",\"subjectId\":$SUBJ3_ID,\"teacherId\":\"$T1_ID\",\"capacity\":20,\"status\":\"active\",\"bannerUrl\":\"https://images.unsplash.com/photo-1547658719-da2b51169166?w=800\",\"bannerCldPubId\":\"seed/webdev\",\"schedules\":[{\"day\":\"Friday\",\"startTime\":\"14:00\",\"endTime\":\"17:00\"}]}")
CLS3_ID=$(jq_get "$CLS3" '.data.id')

echo "  Class IDs: $CLS1_ID  $CLS2_ID  $CLS3_ID"

# ── 4. Enroll students ─────────────────────────────────────────
echo -e "\n[4/6] Enrolling students..."

enroll_direct() {
  local teacher_jar="$1" class_id="$2" student_id="$3"
  post "$teacher_jar" "/api/classes/$class_id/students" "{\"studentId\":\"$student_id\"}" > /dev/null
}

# CS class: all 4 students
enroll_direct "$T1_JAR" "$CLS1_ID" "$S1_ID"
enroll_direct "$T1_JAR" "$CLS1_ID" "$S2_ID"
enroll_direct "$T1_JAR" "$CLS1_ID" "$S3_ID"
enroll_direct "$T1_JAR" "$CLS1_ID" "$S4_ID"

# Math class: 3 students
enroll_direct "$T2_JAR" "$CLS2_ID" "$S1_ID"
enroll_direct "$T2_JAR" "$CLS2_ID" "$S2_ID"
enroll_direct "$T2_JAR" "$CLS2_ID" "$S4_ID"

# Web Dev: 3 students
enroll_direct "$T1_JAR" "$CLS3_ID" "$S2_ID"
enroll_direct "$T1_JAR" "$CLS3_ID" "$S3_ID"
enroll_direct "$T1_JAR" "$CLS3_ID" "$S4_ID"

echo "  Enrollment complete."

# ── 5. Create quizzes ──────────────────────────────────────────
echo -e "\n[5/6] Creating quizzes and attendance..."

# Far-future deadline so quizzes stay open
DEADLINE="2027-12-31T23:59:00.000Z"

QUIZ1=$(post "$T1_JAR" "/api/classes/$CLS1_ID/quizzes" "{
  \"title\": \"Python Basics — Week 2 Check\",
  \"description\": \"Covers variables, data types, conditionals, and loops.\",
  \"durationMinutes\": 20,
  \"deadline\": \"$DEADLINE\",
  \"questions\": [
    {
      \"questionText\": \"Which keyword is used to define a function in Python?\",
      \"options\": [
        {\"optionText\": \"function\", \"isCorrect\": false},
        {\"optionText\": \"def\",      \"isCorrect\": true},
        {\"optionText\": \"fn\",       \"isCorrect\": false},
        {\"optionText\": \"define\",   \"isCorrect\": false}
      ]
    },
    {
      \"questionText\": \"What is the output of: print(type(3.14))?\",
      \"options\": [
        {\"optionText\": \"<class 'int'>\",   \"isCorrect\": false},
        {\"optionText\": \"<class 'float'>\", \"isCorrect\": true},
        {\"optionText\": \"<class 'str'>\",   \"isCorrect\": false},
        {\"optionText\": \"<class 'num'>\",   \"isCorrect\": false}
      ]
    },
    {
      \"questionText\": \"Which of the following is a mutable data type in Python?\",
      \"options\": [
        {\"optionText\": \"tuple\",  \"isCorrect\": false},
        {\"optionText\": \"string\", \"isCorrect\": false},
        {\"optionText\": \"list\",   \"isCorrect\": true},
        {\"optionText\": \"int\",    \"isCorrect\": false}
      ]
    },
    {
      \"questionText\": \"What does the 'range(1,5)' expression produce?\",
      \"options\": [
        {\"optionText\": \"1, 2, 3, 4, 5\", \"isCorrect\": false},
        {\"optionText\": \"1, 2, 3, 4\",    \"isCorrect\": true},
        {\"optionText\": \"0, 1, 2, 3, 4\", \"isCorrect\": false},
        {\"optionText\": \"2, 3, 4\",        \"isCorrect\": false}
      ]
    },
    {
      \"questionText\": \"Which operator is used for integer division in Python 3?\",
      \"options\": [
        {\"optionText\": \"/\",  \"isCorrect\": false},
        {\"optionText\": \"//\", \"isCorrect\": true},
        {\"optionText\": \"%\",  \"isCorrect\": false},
        {\"optionText\": \"^\",  \"isCorrect\": false}
      ]
    }
  ]
}")
QUIZ1_ID=$(jq_get "$QUIZ1" '.data.id')

QUIZ2=$(post "$T2_JAR" "/api/classes/$CLS2_ID/quizzes" "{
  \"title\": \"Derivatives — Unit 1 Quiz\",
  \"description\": \"Test on limits, first principles, and basic differentiation rules.\",
  \"durationMinutes\": 30,
  \"deadline\": \"$DEADLINE\",
  \"questions\": [
    {
      \"questionText\": \"What is the derivative of x² with respect to x?\",
      \"options\": [
        {\"optionText\": \"x\",  \"isCorrect\": false},
        {\"optionText\": \"2x\", \"isCorrect\": true},
        {\"optionText\": \"x²\", \"isCorrect\": false},
        {\"optionText\": \"2\",  \"isCorrect\": false}
      ]
    },
    {
      \"questionText\": \"What is the derivative of a constant?\",
      \"options\": [
        {\"optionText\": \"The constant itself\", \"isCorrect\": false},
        {\"optionText\": \"1\",                   \"isCorrect\": false},
        {\"optionText\": \"0\",                   \"isCorrect\": true},
        {\"optionText\": \"Undefined\",            \"isCorrect\": false}
      ]
    },
    {
      \"questionText\": \"Which rule applies to the derivative of a product of two functions?\",
      \"options\": [
        {\"optionText\": \"Chain rule\",   \"isCorrect\": false},
        {\"optionText\": \"Product rule\", \"isCorrect\": true},
        {\"optionText\": \"Quotient rule\",\"isCorrect\": false},
        {\"optionText\": \"Sum rule\",     \"isCorrect\": false}
      ]
    },
    {
      \"questionText\": \"What is lim(x→0) of sin(x)/x?\",
      \"options\": [
        {\"optionText\": \"0\",         \"isCorrect\": false},
        {\"optionText\": \"Undefined\", \"isCorrect\": false},
        {\"optionText\": \"∞\",         \"isCorrect\": false},
        {\"optionText\": \"1\",         \"isCorrect\": true}
      ]
    }
  ]
}")
QUIZ2_ID=$(jq_get "$QUIZ2" '.data.id')

QUIZ3=$(post "$T1_JAR" "/api/classes/$CLS3_ID/quizzes" "{
  \"title\": \"HTML & CSS Fundamentals Quiz\",
  \"description\": \"Covers semantic HTML5, CSS selectors, box model, and flexbox basics.\",
  \"durationMinutes\": 15,
  \"deadline\": \"$DEADLINE\",
  \"questions\": [
    {
      \"questionText\": \"Which HTML tag defines the largest heading?\",
      \"options\": [
        {\"optionText\": \"<h6>\", \"isCorrect\": false},
        {\"optionText\": \"<h1>\", \"isCorrect\": true},
        {\"optionText\": \"<head>\",\"isCorrect\": false},
        {\"optionText\": \"<title>\",\"isCorrect\": false}
      ]
    },
    {
      \"questionText\": \"Which CSS property controls the space between an element's border and its content?\",
      \"options\": [
        {\"optionText\": \"margin\",  \"isCorrect\": false},
        {\"optionText\": \"spacing\", \"isCorrect\": false},
        {\"optionText\": \"padding\", \"isCorrect\": true},
        {\"optionText\": \"border\",  \"isCorrect\": false}
      ]
    },
    {
      \"questionText\": \"Which CSS value makes an element a flex container?\",
      \"options\": [
        {\"optionText\": \"display: block\",  \"isCorrect\": false},
        {\"optionText\": \"display: flex\",   \"isCorrect\": true},
        {\"optionText\": \"display: grid\",   \"isCorrect\": false},
        {\"optionText\": \"display: inline\", \"isCorrect\": false}
      ]
    }
  ]
}")
QUIZ3_ID=$(jq_get "$QUIZ3" '.data.id')

echo "  Quiz IDs: $QUIZ1_ID  $QUIZ2_ID  $QUIZ3_ID"

# ── 6. Attendance sessions + marks ────────────────────────────
echo -e "\n[5b/6] Creating attendance sessions..."

# Helper: create session, return id
mk_session() {
  local jar="$1" class_id="$2" title="$3" date="$4"
  post "$jar" "/api/classes/$class_id/attendance" \
    "{\"title\":\"$title\",\"date\":\"$date\"}" | jq -r '.data.id'
}

# mark attendance for a session
mark() {
  local jar="$1" class_id="$2" session_id="$3"
  shift 3
  local records="["
  local first=true
  while [[ $# -ge 2 ]]; do
    local sid="$1" st="$2"; shift 2
    $first || records+=","
    records+="{\"studentId\":\"$sid\",\"status\":\"$st\"}"
    first=false
  done
  records+="]"
  post "$jar" "/api/classes/$class_id/attendance/$session_id/mark" \
    "{\"records\":$records}" > /dev/null
}

# CS Class — 4 sessions
CS_S1=$(mk_session "$T1_JAR" "$CLS1_ID" "Lecture 1 — Variables & Data Types"  "$(date -d '21 days ago' +%Y-%m-%d 2>/dev/null || date -v-21d +%Y-%m-%d)")
CS_S2=$(mk_session "$T1_JAR" "$CLS1_ID" "Lecture 2 — Control Flow"             "$(date -d '14 days ago' +%Y-%m-%d 2>/dev/null || date -v-14d +%Y-%m-%d)")
CS_S3=$(mk_session "$T1_JAR" "$CLS1_ID" "Lecture 3 — Functions"                "$(date -d '7 days ago'  +%Y-%m-%d 2>/dev/null || date -v-7d  +%Y-%m-%d)")
CS_S4=$(mk_session "$T1_JAR" "$CLS1_ID" "Lecture 4 — Lists & Dictionaries"     "$(date +%Y-%m-%d)")

mark "$T1_JAR" "$CLS1_ID" "$CS_S1" "$S1_ID" present "$S2_ID" present "$S3_ID" present "$S4_ID" present
mark "$T1_JAR" "$CLS1_ID" "$CS_S2" "$S1_ID" present "$S2_ID" late    "$S3_ID" absent  "$S4_ID" present
mark "$T1_JAR" "$CLS1_ID" "$CS_S3" "$S1_ID" present "$S2_ID" present "$S3_ID" present "$S4_ID" late
mark "$T1_JAR" "$CLS1_ID" "$CS_S4" "$S1_ID" present "$S2_ID" absent  "$S3_ID" late    "$S4_ID" present

# Math Class — 3 sessions
MT_S1=$(mk_session "$T2_JAR" "$CLS2_ID" "Lecture 1 — Limits and Continuity"    "$(date -d '18 days ago' +%Y-%m-%d 2>/dev/null || date -v-18d +%Y-%m-%d)")
MT_S2=$(mk_session "$T2_JAR" "$CLS2_ID" "Lecture 2 — Differentiation Rules"    "$(date -d '11 days ago' +%Y-%m-%d 2>/dev/null || date -v-11d +%Y-%m-%d)")
MT_S3=$(mk_session "$T2_JAR" "$CLS2_ID" "Lecture 3 — Applications of Derivatives" "$(date -d '4 days ago' +%Y-%m-%d 2>/dev/null || date -v-4d +%Y-%m-%d)")

mark "$T2_JAR" "$CLS2_ID" "$MT_S1" "$S1_ID" present "$S2_ID" present "$S4_ID" absent
mark "$T2_JAR" "$CLS2_ID" "$MT_S2" "$S1_ID" late    "$S2_ID" present "$S4_ID" present
mark "$T2_JAR" "$CLS2_ID" "$MT_S3" "$S1_ID" present "$S2_ID" present "$S4_ID" late

# Web Dev Class — 2 sessions
WD_S1=$(mk_session "$T1_JAR" "$CLS3_ID" "Workshop 1 — HTML5 Semantic Structure" "$(date -d '10 days ago' +%Y-%m-%d 2>/dev/null || date -v-10d +%Y-%m-%d)")
WD_S2=$(mk_session "$T1_JAR" "$CLS3_ID" "Workshop 2 — CSS Flexbox & Grid"       "$(date -d '3 days ago'  +%Y-%m-%d 2>/dev/null || date -v-3d  +%Y-%m-%d)")

mark "$T1_JAR" "$CLS3_ID" "$WD_S1" "$S2_ID" present "$S3_ID" late    "$S4_ID" present
mark "$T1_JAR" "$CLS3_ID" "$WD_S2" "$S2_ID" present "$S3_ID" present "$S4_ID" absent

echo "  Attendance sessions created and marked."

# ── 7. Students take quizzes ───────────────────────────────────
echo -e "\n[6/6] Students attempting quizzes..."

take_quiz() {
  local jar="$1" quiz_id="$2"
  shift 2
  # $@ = pairs of questionIndex(0-based) optionIndex(0-based)

  local start_resp
  start_resp=$(post "$jar" "/api/quizzes/$quiz_id/attempt/start" '{}')
  local status
  status=$(echo "$start_resp" | jq -r '.data.attemptId // "conflict"')
  [[ "$status" == "conflict" || -z "$status" ]] && return

  # build answers array from the returned question/option ids
  local answers="["
  local first=true
  local questions
  questions=$(echo "$start_resp" | jq -c '.data.questions')

  while [[ $# -ge 2 ]]; do
    local qi="$1" oi="$2"; shift 2
    local qid oid
    qid=$(echo "$questions" | jq -r ".[$qi].id")
    oid=$(echo "$questions" | jq -r ".[$qi].options[$oi].id")
    $first || answers+=","
    answers+="{\"questionId\":$qid,\"selectedOptionId\":$oid}"
    first=false
  done
  answers+="]"

  post "$jar" "/api/quizzes/$quiz_id/attempt/submit" "{\"answers\":$answers}" > /dev/null
  echo "    ✓ quiz $quiz_id attempted"
}

# Charlie (S1) takes CS quiz — mostly correct (Q1:def, Q2:float, Q3:list, Q4:1-4, Q5://)
take_quiz "$S1_JAR" "$QUIZ1_ID"  0 1  1 1  2 2  3 1  4 1
# Diana (S2) — good on CS
take_quiz "$S2_JAR" "$QUIZ1_ID"  0 1  1 1  2 2  3 1  4 0
# Ethan (S3) — mixed
take_quiz "$S3_JAR" "$QUIZ1_ID"  0 0  1 1  2 2  3 2  4 1
# Fiona (S4) — strong
take_quiz "$S4_JAR" "$QUIZ1_ID"  0 1  1 1  2 2  3 1  4 1

# Math quiz — enrolled: S1, S2, S4
take_quiz "$S1_JAR" "$QUIZ2_ID"  0 1  1 2  2 1  3 3
take_quiz "$S2_JAR" "$QUIZ2_ID"  0 1  1 2  2 1  3 3
take_quiz "$S4_JAR" "$QUIZ2_ID"  0 0  1 2  2 0  3 3

# Web Dev quiz — enrolled: S2, S3, S4
take_quiz "$S2_JAR" "$QUIZ3_ID"  0 1  1 2  2 1
take_quiz "$S3_JAR" "$QUIZ3_ID"  0 1  1 2  2 1
take_quiz "$S4_JAR" "$QUIZ3_ID"  0 0  1 2  2 1

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Seed complete!"
echo ""
echo "  Teachers:"
echo "    alice.johnson@school.edu / Teacher@123   (CS + Web Dev)"
echo "    bob.smith@school.edu     / Teacher@123   (Math)"
echo ""
echo "  Students:"
echo "    charlie.brown@student.edu / Student@123  (CS, Math)"
echo "    diana.prince@student.edu  / Student@123  (CS, Math, Web Dev)"
echo "    ethan.hunt@student.edu    / Student@123  (CS, Web Dev)"
echo "    fiona.green@student.edu   / Student@123  (CS, Math, Web Dev)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
