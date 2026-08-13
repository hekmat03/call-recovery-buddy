import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthShell, SignInForm } from "@/components/auth/auth-ui";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Log in — MissedCall AI" },
      { name: "description", content: "Log in to your MissedCall AI account to review recovered leads and AI follow-ups." },
      { property: "og:title", content: "Log in — MissedCall AI" },
      { property: "og:description", content: "Access your MissedCall AI lead recovery dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to keep recovering missed-call revenue."
      footer={
        <>
          New here?{" "}
          <Link to="/signup" className="text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <SignInForm />
    </AuthShell>
  );
}