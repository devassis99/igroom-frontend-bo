import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { StatusPill } from "@/components/ui/StatusPill";
import { Modal } from "@/components/ui/Modal";
import { OtpInput } from "@/components/ui/OtpInput";
import { useAuthStore } from "@/auth/auth-store";
import { accountApi } from "@/lib/account-api";
import { ApiError } from "@/lib/http";

const modalCancelButtonClass =
  "rounded-[10px] border border-bo-input-border px-[18px] py-[11px] font-sans text-[13px] font-semibold text-bo-ink-soft";
const modalSubmitButtonClass =
  "rounded-[10px] bg-bo-dark px-[18px] py-[11px] font-sans text-[13px] font-semibold text-bo-on-dark disabled:cursor-not-allowed disabled:opacity-50";

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.message;
  return error instanceof Error ? error.message : fallback;
}

/**
 * Two-part flow, both driving off the *same* mutation:
 *  - Normal case (mfaEnabled true): ask for the current 6-digit code
 *    before touching anything, same as re-entering a password to
 *    change a security setting.
 *  - Recovery case (mfaEnabled false): a previous reset was started
 *    but never finished — there's no secret left to check a code
 *    against, so this just continues straight into setup.
 * Either way, success hands off to MfaSetupPage exactly like a
 * first-time invite would.
 */
function ResetMfaModal({
  open,
  onClose,
  mfaEnabled,
}: {
  open: boolean;
  onClose: () => void;
  mfaEnabled: boolean;
}) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  const reset = useMutation({
    mutationFn: (currentCode?: string) => accountApi.resetMfa(currentCode),
    onSuccess: ({ setupToken }) => {
      handleClose();
      navigate("/mfa/setup", { state: { setupToken } });
    },
  });

  function handleClose() {
    setCode("");
    reset.reset();
    onClose();
  }

  return (
    <Modal open={open} onClose={handleClose}>
      <div className="flex items-start justify-between">
        <h1 className="m-0 font-sans text-xl font-semibold text-bo-ink">
          {mfaEnabled ? "Reset Two-Factor Authentication" : "Finish Two-Factor Setup"}
        </h1>
        <button type="button" onClick={handleClose} aria-label="Close" className="font-sans text-xl text-bo-muted-5">
          ×
        </button>
      </div>

      {mfaEnabled ? (
        <>
          <p className="-mt-2.5 m-0 font-sans text-xs leading-relaxed text-bo-muted-5">
            Enter the current code from your authenticator app to confirm it's you, then you'll
            scan a new QR code to finish resetting it — useful if you got a new phone.
          </p>
          <OtpInput value={code} onChange={setCode} disabled={reset.isPending} />
        </>
      ) : (
        <p className="-mt-2.5 m-0 font-sans text-xs leading-relaxed text-bo-muted-5">
          Your two-factor setup wasn't completed last time — there's no current code to check, so
          you can continue straight into setup.
        </p>
      )}

      {reset.isError && (
        <p className="m-0 font-sans text-xs text-bo-danger">
          {errorMessage(reset.error, "Failed to start the reset.")}
        </p>
      )}

      <div className="flex justify-end gap-2.5 pt-1.5">
        <button type="button" onClick={handleClose} className={modalCancelButtonClass}>
          Cancel
        </button>
        <button
          type="button"
          onClick={() => reset.mutate(mfaEnabled ? code : undefined)}
          disabled={reset.isPending || (mfaEnabled && code.length !== 6)}
          className={modalSubmitButtonClass}
        >
          {reset.isPending ? "Continuing…" : "Continue"}
        </button>
      </div>
    </Modal>
  );
}

/**
 * Every logged-in user's own account settings — not gated by any
 * bo_permissions key, unlike every other tab in AppShell, since it's
 * about *your own* account rather than a module someone can be blocked
 * from. Currently just email/role (read-only) and MFA status + reset,
 * since that's all GET /auth/me exposes about the current user today.
 */
export function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  const [resetOpen, setResetOpen] = useState(false);

  return (
    <div>
      <h1 className="m-0 mb-5 font-sans text-2xl font-semibold text-bo-ink">My Account</h1>

      <div className="flex max-w-[560px] flex-col gap-5 rounded-[14px] border border-bo-border bg-bo-surface p-6">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs font-medium tracking-[0.02em] text-bo-muted-1">EMAIL</span>
            <span className="font-sans text-sm font-medium text-bo-ink">{user?.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs font-medium tracking-[0.02em] text-bo-muted-1">ROLE</span>
            <span className="font-sans text-sm font-medium text-bo-ink">{role?.name ?? "—"}</span>
          </div>
        </div>

        <div className="border-t border-bo-border-soft pt-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-sans text-xs font-medium tracking-[0.02em] text-bo-muted-1">
              TWO-FACTOR AUTHENTICATION
            </span>
            <StatusPill tone={user?.mfaEnabled ? "success" : "gold"}>
              {user?.mfaEnabled ? "Enabled" : "Setup incomplete"}
            </StatusPill>
          </div>
          <p className="m-0 mb-3.5 font-sans text-xs leading-relaxed text-bo-muted-5">
            {user?.mfaEnabled
              ? "Required for every back-office sign-in. Reset it if you've lost access to your authenticator app."
              : "A previous setup attempt wasn't finished — you'll be asked for MFA setup again on your next sign-in, or you can finish it now."}
          </p>
          <button
            type="button"
            onClick={() => setResetOpen(true)}
            className="rounded-[10px] border border-bo-input-border bg-bo-surface px-3.5 py-2 font-sans text-xs font-semibold text-bo-ink-soft"
          >
            {user?.mfaEnabled ? "Reset Two-Factor Authentication" : "Finish Setup"}
          </button>
        </div>
      </div>

      <ResetMfaModal open={resetOpen} onClose={() => setResetOpen(false)} mfaEnabled={user?.mfaEnabled ?? false} />
    </div>
  );
}

export default AccountPage;
