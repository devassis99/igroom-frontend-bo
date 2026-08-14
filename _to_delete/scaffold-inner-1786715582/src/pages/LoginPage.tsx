import { useState } from "react";
import { useNavigate } from "react-router";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { authApi } from "@/auth/auth-api";
import { ApiError } from "@/lib/http";

/**
 * Matches Backoffice.dc.html's B0 frame. One deliberate deviation: the
 * mockup draws a custom "Sign in with Google" button, but Google's
 * Identity Services library only lets you theme its own rendered button
 * (outline/pill, here) — a fully custom-styled button can't produce the
 * ID token igroom-backend's POST /auth/google verifies. Everything else
 * (card, copy, spacing, colors, fonts) is exact.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleCredential(credential: CredentialResponse) {
    if (!credential.credential) return;
    setPending(true);
    setError(null);

    try {
      const outcome = await authApi.loginWithGoogle(credential.credential);

      if (outcome.status === "mfa_setup_required") {
        navigate("/mfa/setup", { state: { setupToken: outcome.setupToken }, replace: true });
      } else {
        navigate("/mfa/challenge", {
          state: { challengeToken: outcome.challengeToken },
          replace: true,
        });
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Sign-in failed. Please try again.");
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bo-page px-4">
      <div className="flex w-[380px] flex-col gap-6">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <p className="m-0 font-serif text-2xl font-semibold text-bo-ink">
            iGroom <span className="font-sans text-xs font-medium text-bo-muted-5">Backoffice</span>
          </p>
          <p className="m-0 font-sans text-[13px] text-bo-muted-3">Internal access only</p>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-bo-border bg-bo-surface p-[26px]">
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleCredential}
              onError={() => setError("Google sign-in was cancelled or failed.")}
              theme="outline"
              shape="pill"
              size="large"
              text="signin_with"
              width={300}
            />
          </div>
          {pending && (
            <p className="m-0 text-center font-sans text-sm text-bo-muted-3">Signing in…</p>
          )}
        </div>

        <p className="m-0 text-center font-sans text-[11px] text-bo-muted-6">
          Access restricted to authorized iGroom staff Google accounts. All sign-ins are logged.
        </p>

        {error && (
          <p role="alert" className="m-0 text-center font-sans text-sm text-bo-danger">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}

export default LoginPage;
