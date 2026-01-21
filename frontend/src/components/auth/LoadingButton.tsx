import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface LoadingButtonProps {
  isLoading: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  children: ReactNode;
  onClick?: () => void;
}

export function LoadingButton({
  isLoading,
  disabled,
  type = "submit",
  children,
  onClick,
}: LoadingButtonProps) {
  return (
    <Button
      type={type}
      disabled={isLoading || disabled}
      onClick={onClick}
      className="w-full"
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}
