import { createBrowserRouter } from "react-router-dom";
import { LoginView } from "@/views/auth/LoginView";
import { RegisterView } from "@/views/auth/RegisterView";
import { PasswordResetRequestView } from "@/views/auth/PasswordResetRequestView";
import { PasswordResetConfirmView } from "@/views/auth/PasswordResetConfirmView";
import { DecksView } from "@/views/DecksView";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <LoginView />,
  },
  {
    path: "/login",
    element: <LoginView />,
  },
  {
    path: "/register",
    element: <RegisterView />,
  },
  {
    path: "/password-reset/request",
    element: <PasswordResetRequestView />,
  },
  {
    path: "/password-reset/confirm",
    element: <PasswordResetConfirmView />,
  },
  {
    path: "/decks",
    element: <DecksView />,
  },
]);
