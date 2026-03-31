import { Outlet } from "react-router-dom";

export function TeacherLayout() {
  return (
    <div className="surface-shell teacher-surface">
      <Outlet />
    </div>
  );
}
