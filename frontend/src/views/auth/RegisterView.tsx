import { useState, useId, type FormEvent, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { InlineError } from "@/components/auth/InlineError";
import { PasswordRequirementsHint } from "@/components/auth/PasswordRequirementsHint";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth/useAuth";
import { validateEmail, validatePassword } from "@/lib/validation/password";
import { handleApiError } from "@/lib/api/errorParser";
import type { RegisterFormValues, FieldErrors } from "@/lib/auth/authTypes";

export function RegisterView() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const emailId = useId();
  const passwordId = useId();

  const [values, setValues] = useState<RegisterFormValues>({
    email: "",
    password: "",
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

    // Client-side validation
    const errors: FieldErrors = {};
    
    const emailValidation = validateEmail(values.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error;
    }

    const passwordValidation = validatePassword(values.password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.error;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // Submit to API
    setIsSubmitting(true);

    try {
      await register({
        email: values.email.trim(),
        password: values.password,
      });

      // Redirect to decks on success (auto-login)
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
        title="Zarejestruj się"
        description="Utwórz nowe konto, aby korzystać z 10xCards"
        footer={
          <div className="text-sm text-center text-muted-foreground">
            Masz już konto?{" "}
            <Link
              to="/login"
              className="font-medium text-primary hover:underline"
            >
              Zaloguj się
            </Link>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && <InlineError message={formError} />}

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

          <PasswordRequirementsHint />

          <LoadingButton isLoading={isSubmitting} type="submit">
            Załóż konto
          </LoadingButton>
        </form>
        </AuthCard>
      </AuthLayout>
    </AuthGuard>
  );
}
