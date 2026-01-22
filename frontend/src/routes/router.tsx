import { createBrowserRouter } from "react-router-dom";
import { LoginView } from "@/views/auth/LoginView";
import { RegisterView } from "@/views/auth/RegisterView";
import { PasswordResetRequestView } from "@/views/auth/PasswordResetRequestView";
import { PasswordResetConfirmView } from "@/views/auth/PasswordResetConfirmView";
import { DecksView } from "@/views/DecksView";
import { DeckDetailsView } from "@/views/DeckDetailsView";
import { StudyView } from "@/views/StudyView";
import { AIGenerateView } from "@/views/ai/AIGenerateView";
import { AILoadingView } from "@/views/ai/AILoadingView";

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
  {
    path: "/decks/:deckId",
    element: <DeckDetailsView />,
  },
  {
    path: "/decks/:deckId/study",
    element: <StudyView />,
  },
  {
    path: "/ai/generate",
    element: <AIGenerateView />,
  },
  {
    path: "/ai/loading",
    element: <AILoadingView />,
  },
]);
