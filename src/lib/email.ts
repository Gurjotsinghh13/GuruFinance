// ============================================================
// EMAIL DELIVERY SERVICE - Custom REST Email Provider Abstraction
// Production-ready abstraction for delivering password reset emails.
// Required Environment Variables:
// - EMAIL_PROVIDER_URL  (e.g. "https://api.resend.com/emails")
// - EMAIL_PROVIDER_API_KEY (Provider Authorization Header / API Key)
//
// Contract:
// HTTP POST to EMAIL_PROVIDER_URL with JSON body { to, subject, text }.
// Expects HTTP 2xx response status on success.
// ============================================================

export async function sendPasswordResetEmail(
  email: string,
  resetToken: string
): Promise<{ success: boolean; error?: string }> {
  const providerApiKey = process.env.EMAIL_PROVIDER_API_KEY;
  const providerUrl = process.env.EMAIL_PROVIDER_URL;
  const maskedEmail = email
    ? email.replace(/^(.{2}).*@/, "$1***@")
    : "****@****";

  // Check required provider configuration
  if (!providerApiKey || !providerUrl) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        `[Email Warning] Production email provider credentials missing (EMAIL_PROVIDER_API_KEY / EMAIL_PROVIDER_URL). Failed dispatch for ${maskedEmail}.`
      );
      return {
        success: false,
        error: "Password reset delivery is not configured",
      };
    }
    // In development mode, return success for local test workflows
    return { success: true };
  }

  try {
    const response = await fetch(providerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: providerApiKey,
      },
      body: JSON.stringify({
        to: email,
        subject: "LoanBook — Password Reset",
        text: `Your LoanBook password reset token is: ${resetToken}\n\nThis token expires in 1 hour.\n\nIf you did not request a password reset, ignore this email.`,
      }),
    });

    if (!response.ok) {
      console.error(
        `[Email Error] Provider responded with HTTP status ${response.status} for ${maskedEmail}.`
      );
      return { success: false, error: "Email dispatch failed" };
    }

    return { success: true };
  } catch (err: any) {
    console.error(
      `[Email Exception] Error delivering email for ${maskedEmail}:`,
      err?.message
    );
    return { success: false, error: "Email dispatch network error" };
  }
}
