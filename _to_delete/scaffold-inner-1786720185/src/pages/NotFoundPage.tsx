import { Link } from "react-router";

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-2 bg-bo-page">
      <h1 className="font-sans text-lg font-semibold text-bo-ink">Page not found</h1>
      <Link to="/" className="font-sans text-sm text-bo-gold">
        Back to dashboard
      </Link>
    </main>
  );
}

export default NotFoundPage;
