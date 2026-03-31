import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../lib/auth-context";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<"teacher" | "student">("teacher");
  const [id, setId] = useState("T10001");
  const [password, setPassword] = useState("Test@123");
  const [message, setMessage] = useState("");

  function changeRole(nextRole: "teacher" | "student") {
    setRole(nextRole);
    setId(nextRole === "teacher" ? "T10001" : "202511040167");
    setPassword("Test@123");
    setMessage("");
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const result = await login(role, id, password);
    if (!result.ok) {
      setMessage(result.message ?? "登录失败。");
      return;
    }
    navigate(role === "teacher" ? "/" : "/student");
  }

  return (
    <div className="proto-auth-shell">
      <div className="proto-auth-panel">
        <div className="proto-eyebrow">Login</div>
        <h1 className="proto-title">系统登录</h1>
        <p className="proto-desc">教师使用工号登录并进入教师端，学生使用学号登录并进入学生端。</p>

        <div className="proto-auth-tabs">
          <button className={role === "teacher" ? "active" : ""} onClick={() => changeRole("teacher")} type="button">
            教师登录
          </button>
          <button className={role === "student" ? "active" : ""} onClick={() => changeRole("student")} type="button">
            学生登录
          </button>
        </div>

        <form className="proto-form" onSubmit={handleSubmit}>
          <div className="proto-field">
            <label>{role === "teacher" ? "工号" : "学号"}</label>
            <input value={id} onChange={(event) => setId(event.target.value)} placeholder={role === "teacher" ? "请输入工号" : "请输入学号"} />
          </div>
          <div className="proto-field">
            <label>密码</label>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="请输入密码" />
          </div>
          <div className="proto-actions">
            <button className="proto-btn primary" type="submit">
              登录
            </button>
          </div>
        </form>

        <div className="proto-actions" style={{ marginTop: 16 }}>
          <Link className="proto-btn" to="/register">
            注册账号
          </Link>
          <Link className="proto-btn" to="/password-reset">
            修改/重置密码
          </Link>
        </div>

        {message ? <div className="proto-alert warn">{message}</div> : null}
      </div>
    </div>
  );
}
