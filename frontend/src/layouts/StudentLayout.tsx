import { Outlet } from "react-router-dom";

export function StudentLayout() {
  return (
    <div className="surface-shell student-surface">
      <Outlet />
    </div>
  );
}
