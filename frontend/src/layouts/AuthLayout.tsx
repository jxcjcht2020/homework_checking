import type { PropsWithChildren, ReactNode } from "react";

interface AuthLayoutProps extends PropsWithChildren {
  title: string;
  subtitle: string;
  footer?: ReactNode;
}

export function AuthLayout({ title, subtitle, footer, children }: AuthLayoutProps) {
  return (
    <div className="auth-shell">
      <div className="auth-panel">
        <div className="auth-intro">
          <span className="eyebrow">Homework Checking Platform</span>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="auth-card">
          {children}
          {footer ? <div className="auth-footer">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
