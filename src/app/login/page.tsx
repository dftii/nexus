import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { Brand } from "@/components/layout/brand";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signInWithDiscordAction } from "@/features/auth/actions";
import { DiscordSubmitButton } from "@/features/auth/components/discord-submit-button";
import { loginErrorMessage } from "@/features/auth/login-errors";
import { safeRedirectPath } from "@/features/auth/redirect";
import { isAuthConfigured } from "@/lib/env";
import { getCurrentUser } from "@/server/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to NEXUS with your Discord account.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const configured = isAuthConfigured();

  if (configured && (await getCurrentUser())) redirect("/");

  // Without configuration the only honest message is "not configured",
  // whatever the query string says.
  const error = configured
    ? loginErrorMessage(params.error)
    : loginErrorMessage("Configuration");
  const callbackUrl = params.callbackUrl;
  const redirectTo = safeRedirectPath(
    Array.isArray(callbackUrl) ? callbackUrl[0] : callbackUrl,
  );

  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-4 py-10"
    >
      <div className="flex justify-center">
        <Brand />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sign in to NEXUS</CardTitle>
          <CardDescription>
            Use your Discord account to manage the servers you run.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {error ? (
            <p
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-destructive/50 px-3 py-2.5 text-sm"
            >
              <TriangleAlert
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0 text-destructive"
              />
              <span>{error}</span>
            </p>
          ) : null}

          <form action={signInWithDiscordAction}>
            <input type="hidden" name="redirectTo" value={redirectTo} />
            <DiscordSubmitButton
              size="lg"
              className="w-full"
              disabled={!configured}
            />
          </form>

          <section aria-labelledby="permissions-heading" className="space-y-2">
            <h2 id="permissions-heading" className="text-sm font-medium">
              What NEXUS asks Discord for
            </h2>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>
                <code className="font-mono text-foreground">identify</code>:
                your username and avatar.
              </li>
              <li>
                <code className="font-mono text-foreground">guilds</code>: the
                list of servers you belong to, to find the ones you can manage.
              </li>
            </ul>
            <p className="text-sm text-muted-foreground">
              NEXUS never posts on your behalf and never asks for your email or
              password.
            </p>
          </section>
        </CardContent>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        Just looking around?{" "}
        <Link
          href="/demo"
          className="text-primary underline-offset-4 hover:underline"
        >
          Explore the demo
        </Link>
      </p>
    </main>
  );
}
