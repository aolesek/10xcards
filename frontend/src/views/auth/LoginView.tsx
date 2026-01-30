import { useState, useId, useEffect, type FormEvent, type ChangeEvent } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { InlineError } from "@/components/auth/InlineError";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/useAuth";
import { validateEmail } from "@/lib/validation/password";
import { handleApiError } from "@/lib/api/errorParser";
import type { LoginFormValues, FieldErrors } from "@/lib/auth/authTypes";

export function LoginView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const emailId = useId();
  const passwordId = useId();

  const [values, setValues] = useState<LoginFormValues>({
    email: "",
    password: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Show success message from navigation state (e.g., after password reset)
  useEffect(() => {
    const state = location.state as { message?: string } | null;
    if (state?.message) {
      setSuccessMessage(state.message);
      // Clear the state to prevent showing message on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

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

    // Client-side validation
    const errors: FieldErrors = {};
    
    const emailValidation = validateEmail(values.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error;
    }

    if (!values.password) {
      errors.password = "Hasło jest wymagane";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // Submit to API
    setIsSubmitting(true);

    try {
      await login({
        email: values.email.trim(),
        password: values.password,
      });

      // Redirect to decks on success
      navigate("/decks", { replace: true });
    } catch (error) {
      const { fieldErrors: apiFieldErrors, globalError } = handleApiError(error);
      
      setFieldErrors(apiFieldErrors);
      setFormError(globalError);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <AuthLayout>
      <AuthCard
        title="Zaloguj się"
        description="Wprowadź swoje dane, aby uzyskać dostęp do konta"
        footer={
          <div className="text-sm text-center text-muted-foreground">
            Nie masz konta?{" "}
            <Link
              to="/register"
              className="font-medium text-primary hover:underline"
            >
              Zarejestruj się
            </Link>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <InlineError message={formError} />}

          {successMessage && (
            <Alert role="alert" aria-live="polite" className="border-green-500">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor={emailId}>Email</Label>
            <Input
              id={emailId}
              name="email"
              type="email"
              value={values.email}
              onChange={handleChange}
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.email}
              aria-describedby={fieldErrors.email ? `${emailId}-error` : undefined}
              data-testid="login-email-input"
            />
            {fieldErrors.email && (
              <p
                id={`${emailId}-error`}
                className="text-sm text-destructive"
                role="alert"
              >
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={passwordId}>Hasło</Label>
            <Input
              id={passwordId}
              name="password"
              type="password"
              value={values.password}
              onChange={handleChange}
              disabled={isSubmitting}
              aria-invalid={!!fieldErrors.password}
              aria-describedby={fieldErrors.password ? `${passwordId}-error` : undefined}
              data-testid="login-password-input"
            />
            {fieldErrors.password && (
              <p
                id={`${passwordId}-error`}
                className="text-sm text-destructive"
                role="alert"
              >
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div className="text-sm text-right">
            <Link
              to="/password-reset/request"
              className="text-primary hover:underline"
            >
              Zapomniałeś hasła?
            </Link>
          </div>

          <LoadingButton isLoading={isSubmitting} type="submit" data-testid="login-submit-button">
            Zaloguj się
          </LoadingButton>
        </form>
      </AuthCard>
    </AuthLayout>
    </AuthGuard>
  );
}
