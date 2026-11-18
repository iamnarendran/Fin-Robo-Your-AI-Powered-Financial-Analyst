export function SiteFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>Market data from Yahoo Finance, may be delayed. For education only, not investment advice.</p>
        <a
          href="https://github.com/iamnarendran/Fin-Robo-Your-AI-Powered-Financial-Analyst"
          className="transition-colors hover:text-foreground"
          target="_blank"
          rel="noreferrer"
        >
          Source on GitHub
        </a>
      </div>
    </footer>
  );
}
