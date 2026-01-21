import { useState, useId, type FormEvent, type ChangeEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { InlineError } from "@/components/auth/InlineError";
import { PasswordRequirementsHint } from "@/components/auth/PasswordRequirementsHint";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";
import { confirmPasswordReset } from "@/lib/api/authApi";
import { validatePassword } from "@/lib/validation/password";
import { handleApiError } from "@/lib/api/errorParser";
import type {
  PasswordResetConfirmFormValues,
  FieldErrors,
} from "@/lib/auth/authTypes";

export function PasswordResetConfirmView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const passwordId = useId();

  const [values, setValues] = useState<PasswordResetConfirmFormValues>({
    newPassword: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    
    // Clear errors on change
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setFormError(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Reset errors
    setFieldErrors({});
    setFormError(null);

    // Check if token exists
    if (!token) {
      setFormError("Brak tokenu resetującego w linku. Spróbuj ponownie zażądać resetu hasła.");
      return;
    }

    // Client-side validation
    const errors: FieldErrors = {};
    
    const passwordValidation = validatePassword(values.newPassword);
    if (!passwordValidation.isValid) {
      errors.newPassword = passwordValidation.error;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // Submit to API
    setIsSubmitting(true);

    try {
      await confirmPasswordReset({
        token,
        newPassword: values.newPassword,
      });

      // Redirect to login with success message
      navigate("/login", {
        replace: true,
        state: { message: "Hasło zostało pomyślnie zmienione. Możesz się teraz zalogować." },
      });
    } catch (error) {
      const { fieldErrors: apiFieldErrors, globalError } = handleApiError(error);
      
      setFieldErrors(apiFieldErrors);
      setFormError(globalError);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show error if no token in URL
  if (!token) {
    return (
      <AuthGuard>
        <AuthLayout>
          <AuthCard
          title="Resetuj hasło"
          description="Ustaw nowe hasło dla swojego konta"
        >
          <Alert variant="destructive" role="alert">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Brak tokenu resetującego w linku. Link może być nieprawidłowy lub
              wygasł.
            </AlertDescription>
          </Alert>

          <div className="mt-4">
            <Link to="/password-reset/request">
              <LoadingButton isLoading={false} type="button">
                Zażądaj nowego linku
              </LoadingButton>
            </Link>
          </div>
          </AuthCard>
        </AuthLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <AuthLayout>
        <AuthCard
        title="Resetuj hasło"
        description="Ustaw nowe hasło dla swojego konta"
        footer={
          <div className="text-sm text-center text-muted-foreground">
            Pamiętasz hasło?{" "}
            <Link
              to="/login"
              className="font-medium text-primary hover:underline"
            >
              Wróć do logowania
            </Link>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <InlineError message={formError} />}

          <div className="space-y-2">
            <Label htmlFor={passwordId}>Nowe hasło</Label>
            <Input
              id={passwordId}
              name="newPassword"
              type="password"
              value={values.newPassword}
              onChange={handleChange}
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.newPassword}
              aria-describedby={
                fieldErrors.newPassword ? `${passwordId}-error` : undefined
              }
            />
            {fieldErrors.newPassword && (
              <p
                id={`${passwordId}-error`}
                className="text-sm text-destructive"
                role="alert"
              >
                {fieldErrors.newPassword}
              </p>
            )}
          </div>

          <PasswordRequirementsHint />

          <LoadingButton isLoading={isSubmitting} type="submit">
            Zmień hasło
          </LoadingButton>
        </form>
        </AuthCard>
      </AuthLayout>
    </AuthGuard>
  );
}
