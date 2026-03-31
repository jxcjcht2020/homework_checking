import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth-context";

export function PasswordResetPage() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<"teacher" | "student">("teacher");
  const [form, setForm] = useState({
    id: "",
    contact: "",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");

  function updateField(field: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = await updatePassword({ role, ...form });
    if (!result.ok) {
      setMessage(result.message ?? "修改失败。");
      return;
    }
    setMessage("密码修改成功，正在返回登录页面。");
    window.setTimeout(() => navigate("/login"), 700);
  }

  return (
    <div className="proto-auth-shell">
      <div className="proto-auth-panel wide">
        <div className="proto-eyebrow">Password</div>
        <h1 className="proto-title">密码管理</h1>
        <p className="proto-desc">通过学号或工号、联系方式完成密码重置。当前版本不再要求验证码。</p>

        <div className="proto-auth-tabs">
          <button className={role === "teacher" ? "active" : ""} onClick={() => setRole("teacher")} type="button">
            教师
          </button>
          <button className={role === "student" ? "active" : ""} onClick={() => setRole("student")} type="button">
            学生
          </button>
        </div>

        <form className="proto-form" onSubmit={handleSubmit}>
          <div className="proto-grid-2">
            <div className="proto-field">
              <label>{role === "teacher" ? "工号" : "学号"}</label>
              <input value={form.id} onChange={(event) => updateField("id", event.target.value)} placeholder={role === "teacher" ? "请输入工号" : "请输入学号"} />
            </div>
            <div className="proto-field">
              <label>联系方式</label>
              <input value={form.contact} onChange={(event) => updateField("contact", event.target.value)} placeholder="请输入注册联系方式" />
            </div>
          </div>
          <div className="proto-grid-2">
            <div className="proto-field">
              <label>新密码</label>
              <input type="password" value={form.password} onChange={(event) => updateField("password", event.target.value)} placeholder="请输入新密码" />
            </div>
            <div className="proto-field">
              <label>确认新密码</label>
              <input type="password" value={form.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} placeholder="请再次输入新密码" />
            </div>
          </div>
          <div className="proto-actions">
            <button className="proto-btn primary" type="submit">
              确认修改
            </button>
          </div>
        </form>

        <div className="proto-actions" style={{ marginTop: 16 }}>
          <Link className="proto-btn" to="/login">
            返回登录
          </Link>
          <Link className="proto-btn" to="/register">
            注册账号
          </Link>
        </div>

        {message ? <div className={`proto-alert ${message.includes("成功") ? "ok" : "warn"}`}>{message}</div> : null}
      </div>
    </div>
  );
}
