import { useState, useId, type FormEvent, type ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoadingButton } from "@/components/auth/LoadingButton";
import { InlineError } from "@/components/auth/InlineError";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CheckCircle2 } from "lucide-react";
import { requestPasswordReset } from "@/lib/api/authApi";
import { validateEmail } from "@/lib/validation/password";
import { handleApiError } from "@/lib/api/errorParser";
import type {
  PasswordResetRequestFormValues,
  FieldErrors,
} from "@/lib/auth/authTypes";

export function PasswordResetRequestView() {
  const emailId = useId();

  const [values, setValues] = useState<PasswordResetRequestFormValues>({
    email: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    
    // Clear errors on change
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
    setFormError(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Reset messages
    setFieldErrors({});
    setFormError(null);
    setSuccessMessage(null);

    // Client-side validation
    const errors: FieldErrors = {};
    
    const emailValidation = validateEmail(values.email);
    if (!emailValidation.isValid) {
      errors.email = emailValidation.error;
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    // Submit to API
    setIsSubmitting(true);

    try {
      const response = await requestPasswordReset({
        email: values.email.trim(),
      });

      // Show non-revealing success message
      setSuccessMessage(response.message);
      setValues({ email: "" }); // Clear form
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
        title="Resetuj hasło"
        description="Wprowadź swój adres email, aby otrzymać link do resetowania hasła"
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

          <LoadingButton isLoading={isSubmitting} type="submit">
            Wyślij link resetujący
          </LoadingButton>
        </form>
        </AuthCard>
      </AuthLayout>
    </AuthGuard>
  );
}
