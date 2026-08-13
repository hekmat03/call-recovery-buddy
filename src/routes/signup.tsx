import { createFileRoute, Link } from "@tanstack/react-router";
import { AuthShell, SignUpForm } from "@/components/auth/auth-ui";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Start free trial — MissedCall AI" },
      { name: "description", content: "Create your MissedCall AI account and start turning missed calls into booked jobs in minutes." },
      { property: "og:title", content: "Start free trial — MissedCall AI" },
      { property: "og:description", content: "Set up automated AI follow-ups for every missed call." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle="Every account gets its own private business workspace."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <SignUpForm />
    </AuthShell>
  );
}