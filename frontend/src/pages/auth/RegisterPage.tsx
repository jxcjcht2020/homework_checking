import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth-context";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<"teacher" | "student">("teacher");
  const [form, setForm] = useState({
    name: "",
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
    const result = await register({ role, ...form });
    if (!result.ok) {
      setMessage(result.message ?? "注册失败。");
      return;
    }
    setMessage("注册成功，正在跳转到登录页面。");
    window.setTimeout(() => navigate("/login"), 700);
  }

  return (
    <div className="proto-auth-shell">
      <div className="proto-auth-panel wide">
        <div className="proto-eyebrow">Register</div>
        <h1 className="proto-title">注册账号</h1>
        <p className="proto-desc">注册时需要填写姓名、学/工号、密码和联系方式。当前系统已预置测试教师与测试学生账号，也支持继续新增账号。</p>

        <div className="proto-auth-tabs">
          <button className={role === "teacher" ? "active" : ""} onClick={() => setRole("teacher")} type="button">
            教师注册
          </button>
          <button className={role === "student" ? "active" : ""} onClick={() => setRole("student")} type="button">
            学生注册
          </button>
        </div>

        <form className="proto-form" onSubmit={handleSubmit}>
          <div className="proto-grid-2">
            <div className="proto-field">
              <label>姓名</label>
              <input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="请输入姓名" />
            </div>
            <div className="proto-field">
              <label>{role === "teacher" ? "工号" : "学号"}</label>
              <input value={form.id} onChange={(event) => updateField("id", event.target.value)} placeholder={role === "teacher" ? "请输入工号" : "请输入学号"} />
            </div>
          </div>
          <div className="proto-grid-2">
            <div className="proto-field">
              <label>密码</label>
              <input type="password" value={form.password} onChange={(event) => updateField("password", event.target.value)} placeholder="请输入密码" />
            </div>
            <div className="proto-field">
              <label>确认密码</label>
              <input type="password" value={form.confirmPassword} onChange={(event) => updateField("confirmPassword", event.target.value)} placeholder="请再次输入密码" />
            </div>
          </div>
          <div className="proto-field">
            <label>联系方式</label>
            <input value={form.contact} onChange={(event) => updateField("contact", event.target.value)} placeholder="请输入手机号或邮箱" />
          </div>
          <div className="proto-actions">
            <button className="proto-btn primary" type="submit">
              确认注册
            </button>
          </div>
        </form>

        <div className="proto-actions" style={{ marginTop: 16 }}>
          <Link className="proto-btn" to="/login">
            返回登录
          </Link>
          <Link className="proto-btn" to="/password-reset">
            修改/重置密码
          </Link>
        </div>

        {message ? <div className={`proto-alert ${message.includes("成功") ? "ok" : "warn"}`}>{message}</div> : null}
      </div>
    </div>
  );
}
