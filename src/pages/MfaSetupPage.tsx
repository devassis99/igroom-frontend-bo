import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { authApi } from "@/auth/auth-api";
import { useAuthStore } from "@/auth/auth-store";
import { ApiError } from "@/lib/http";
import { OtpInput } from "@/components/ui/OtpInput";
import type { MfaSetupDetails } from "@/auth/types";

interface LocationState {
  setupToken?: string;
}

/**
 * Not a frame in Backoffice.dc.html (the mockup only shows the returning-
 * user code challenge, B0.5) — igroom-backend requires MFA enrollment
 * before a first-time login ever gets a real session, so this screen has
 * to exist. Built in the same visual language as B0.5/B0 rather than
 * improvising a different style: same card, same OTP boxes, same button.
 */
export function MfaSetupPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const setupToken = (location.state as LocationState | null)?.setupToken;

  const [details, setDetails] = useState<MfaSetupDetails | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!setupToken) return;
    authApi
      .beginMfaSetup(setupToken)
      .then(setDetails)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not start MFA setup."));
  }, [setupToken]);

  if (!setupToken) {
    return <Navigate to="/login" replace />;
  }

  async function submit(fullCode: string) {
    if (!setupToken || pending) return;
    setPending(true);
    setError(null);

    try {
      const tokens = await authApi.completeMfaSetup(setupToken, fullCode);
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
            Set up two-factor auth
          </p>
          <p className="m-0 font-sans text-[13px] text-bo-muted-3">
            Scan with an authenticator app (Google Authenticator, Authy, 1Password), then enter
            the 6-digit code it shows.
          </p>
        </div>

        <div className="flex flex-col gap-[18px] rounded-2xl border border-bo-border bg-bo-surface p-[26px]">
          {details ? (
            <img
              src={details.qrCodeDataUrl}
              alt="Scan with your authenticator app"
              className="mx-auto h-44 w-44"
            />
          ) : (
            !error && (
              <p className="m-0 text-center font-sans text-sm text-bo-muted-3">Loading…</p>
            )
          )}

          <OtpInput
            value={code}
            onChange={setCode}
            onComplete={submit}
            disabled={pending || !details}
          />
          <button
            type="button"
            onClick={() => submit(code)}
            disabled={pending || code.length !== 6 || !details}
            className="rounded-xl bg-bo-dark py-[15px] font-sans text-[15px] font-semibold text-bo-on-dark disabled:opacity-50"
          >
            {pending ? "Verifying…" : "Confirm and finish setup"}
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

export default MfaSetupPage;
