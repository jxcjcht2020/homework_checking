import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "../lib/auth-context";
import { AppRouter } from "../router/AppRouter";

export function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
    </AuthProvider>
  );
}
