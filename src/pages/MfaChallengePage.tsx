import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { authApi } from "@/auth/auth-api";
import { useAuthStore } from "@/auth/auth-store";
import { ApiError } from "@/lib/http";
import { OtpInput } from "@/components/ui/OtpInput";

interface LocationState {
  challengeToken?: string;
}

/**
 * Matches Backoffice.dc.html's B0.5 frame. One copy deviation from the
 * mockup: it says "We sent a 6-digit code to a****n@igroom.io" (an
 * SMS/email-delivered code), but igroom-backend uses TOTP — the code
 * comes from an authenticator app, nothing is sent — so the copy here
 * reflects that instead. No "Resend code" link for the same reason.
 */
export function MfaChallengePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const challengeToken = (location.state as LocationState | null)?.challengeToken;

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (!challengeToken) {
    return <Navigate to="/login" replace />;
  }

  async function submit(fullCode: string) {
    if (!challengeToken || pending) return;
    setPending(true);
    setError(null);

    try {
      const tokens = await authApi.verifyMfaChallenge(challengeToken, fullCode);
      const { user, role, permissions } = await authApi.me(tokens.accessToken);
      useAuthStore.getState().setSession({ ...tokens, user, role, permissions });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Invalid code. Please try again.");
      setCode("");
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-bo-page px-4">
      <div className="flex w-[380px] flex-col gap-6">
        <div className="flex flex-col items-center gap-1.5 text-center">
          <p className="m-0 font-serif text-2xl font-semibold text-bo-ink">
            Enter verification code
          </p>
          <p className="m-0 font-sans text-[13px] text-bo-muted-3">
            Open your authenticator app and enter the current code.
          </p>
        </div>

        <div className="flex flex-col gap-[18px] rounded-2xl border border-bo-border bg-bo-surface p-[26px]">
          <OtpInput value={code} onChange={setCode} onComplete={submit} disabled={pending} />
          <button
            type="button"
            onClick={() => submit(code)}
            disabled={pending || code.length !== 6}
            className="rounded-xl bg-bo-dark py-[15px] font-sans text-[15px] font-semibold text-bo-on-dark disabled:opacity-50"
          >
            {pending ? "Verifying…" : "Verify & sign in"}
          </button>
        </div>

        {error && (
          <p role="alert" className="m-0 text-center font-sans text-sm text-bo-danger">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}

export default MfaChallengePage;
