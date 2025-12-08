package pl.olesek._xcards.email.template;

public class PasswordResetEmailTemplate {

    public static String generate(String resetLink) {
        return """
                Password Reset Request

                Hello,

                We received a request to reset your password for your 10xCards account.

                Click the link below to reset your password:
                %s

                This link will expire in 24 hours.

                If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

                ---
                This is an automated message from 10xCards. Please do not reply to this email.
                """
                .formatted(resetLink);
    }
}

