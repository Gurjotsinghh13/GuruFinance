// ============================================================
// SMS DELIVERY SERVICE - Custom REST SMS Provider Abstraction
// Production-ready abstraction for delivering password reset SMS.
// Required Environment Variables:
// - SMS_PROVIDER_URL (e.g. "https://api.custom-sms.com/send")
// - SMS_PROVIDER_API_KEY (Provider Authorization Header / API Key)
//
// Contract:
// HTTP POST to SMS_PROVIDER_URL with JSON body { mobile, message }.
// Expects HTTP 2xx response status on success.
// ============================================================

export async function sendPasswordResetSMS(
  mobile: string,
  resetToken: string
): Promise<{ success: boolean; error?: string }> {
  const providerApiKey = process.env.SMS_PROVIDER_API_KEY;
  const providerUrl = process.env.SMS_PROVIDER_URL;
  const maskedMobile = mobile ? `***${mobile.slice(-4)}` : "****";

  // Check required provider configuration
  if (!providerApiKey || !providerUrl) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        `[SMS Warning] Production SMS provider credentials missing (SMS_PROVIDER_API_KEY / SMS_PROVIDER_URL). Failed dispatch for ${maskedMobile}.`
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
        mobile,
        message: `Your LoanBook password reset token is: ${resetToken}. This token expires in 1 hour.`,
      }),
    });

    if (!response.ok) {
      console.error(
        `[SMS Error] Provider responded with HTTP status ${response.status} for ${maskedMobile}.`
      );
      return { success: false, error: "SMS dispatch failed" };
    }

    return { success: true };
  } catch (err: any) {
    console.error(
      `[SMS Exception] Error delivering SMS for ${maskedMobile}:`,
      err?.message
    );
    return { success: false, error: "SMS dispatch network error" };
  }
}
