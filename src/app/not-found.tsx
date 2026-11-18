import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-24 text-center">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="text-2xl font-semibold tracking-tight">We couldn’t find that</h1>
      <p className="text-sm text-muted-foreground">
        The symbol may be delisted or mistyped. Indian stocks use an exchange suffix, for example{" "}
        <code className="rounded bg-muted px-1">RELIANCE.NS</code>.
      </p>
      <Link href="/" className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
        Back to markets
      </Link>
    </div>
  );
}
