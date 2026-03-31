import { readStorage, writeStorage } from "./storage";

export type TeacherTab = "students" | "assignments";
export type StudentView = "card" | "list";

export interface TeacherHomeState {
  focusLevelId: string;
  selectedCourseByLevel: Record<string, string>;
  tabByLevel: Record<string, TeacherTab>;
  viewByLevel: Record<string, StudentView>;
  studentSearchDraftByLevel: Record<string, string>;
  studentSearchByLevel: Record<string, string>;
}

const KEY = "teacher_home_workspace_state_v1";

export function readTeacherHomeState(): TeacherHomeState {
  return readStorage<TeacherHomeState>(KEY, {
    focusLevelId: "",
    selectedCourseByLevel: { graduate: "grad_derivatives" },
    tabByLevel: {},
    viewByLevel: {},
    studentSearchDraftByLevel: {},
    studentSearchByLevel: {},
  });
}

export function writeTeacherHomeState(state: TeacherHomeState) {
  writeStorage(KEY, state);
}

