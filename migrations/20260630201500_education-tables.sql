-- Education: teachers
CREATE TABLE IF NOT EXISTS teachers (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  first_name     text NOT NULL,
  last_name      text NOT NULL,
  phone          text,
  email          text,
  subject        text,
  salary_usd     numeric(10,2) DEFAULT 0,
  hire_date      date DEFAULT CURRENT_DATE,
  status         text DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sel_teachers" ON teachers FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
CREATE POLICY "ins_teachers" ON teachers FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "upd_teachers" ON teachers FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "del_teachers" ON teachers FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

-- Education: classes
CREATE TABLE IF NOT EXISTS classes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name           text NOT NULL,
  level          text,
  teacher_id     uuid REFERENCES teachers(id) ON DELETE SET NULL,
  fees_usd       numeric(10,2) DEFAULT 0,
  status         text DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sel_classes" ON classes FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
CREATE POLICY "ins_classes" ON classes FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "upd_classes" ON classes FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "del_classes" ON classes FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

-- Education: attendance
CREATE TABLE IF NOT EXISTS attendance (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  student_id     uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id       uuid REFERENCES classes(id) ON DELETE SET NULL,
  date           date NOT NULL DEFAULT CURRENT_DATE,
  status         text NOT NULL DEFAULT 'present' CHECK (status IN ('present','absent','late','excused')),
  notes          text,
  created_at     timestamptz DEFAULT now(),
  UNIQUE(student_id, date)
);
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sel_attendance" ON attendance FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
CREATE POLICY "ins_attendance" ON attendance FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "upd_attendance" ON attendance FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "del_attendance" ON attendance FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

-- Education: exams
CREATE TABLE IF NOT EXISTS exams (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  class_id       uuid NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name           text NOT NULL,
  subject        text,
  date           date,
  max_score      numeric(10,2) DEFAULT 20,
  coefficient    integer DEFAULT 1,
  term           text,
  created_at     timestamptz DEFAULT now()
);
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sel_exams" ON exams FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
CREATE POLICY "ins_exams" ON exams FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "upd_exams" ON exams FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "del_exams" ON exams FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

-- Education: exam_results (grades)
CREATE TABLE IF NOT EXISTS exam_results (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  exam_id        uuid NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id     uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  score          numeric(10,2) NOT NULL DEFAULT 0,
  grade          text,
  remarks        text,
  created_at     timestamptz DEFAULT now(),
  UNIQUE(exam_id, student_id)
);
ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sel_exam_results" ON exam_results FOR SELECT TO authenticated USING (is_workspace_owner(workspace_id));
CREATE POLICY "ins_exam_results" ON exam_results FOR INSERT TO authenticated WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "upd_exam_results" ON exam_results FOR UPDATE TO authenticated USING (is_workspace_owner(workspace_id)) WITH CHECK (is_workspace_owner(workspace_id));
CREATE POLICY "del_exam_results" ON exam_results FOR DELETE TO authenticated USING (is_workspace_owner(workspace_id));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teachers_ws ON teachers(workspace_id);
CREATE INDEX IF NOT EXISTS idx_classes_ws ON classes(workspace_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_attendance_ws ON attendance(workspace_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_exams_ws ON exams(workspace_id);
CREATE INDEX IF NOT EXISTS idx_exams_class ON exams(class_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_ws ON exam_results(workspace_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam ON exam_results(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON exam_results(student_id);

-- Grants
GRANT ALL ON teachers TO authenticated;
GRANT ALL ON classes TO authenticated;
GRANT ALL ON attendance TO authenticated;
GRANT ALL ON exams TO authenticated;
GRANT ALL ON exam_results TO authenticated;
