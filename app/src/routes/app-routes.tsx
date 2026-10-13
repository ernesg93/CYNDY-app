import { useEffect, useRef, useState, type FormEvent } from "react";
import type { CurrencyConfiguration, ValidationIssue } from "../domain/validation";
import { validateCurrencyConfiguration } from "../domain/validation";
import type { IndexedDbRepository } from "../storage/indexed-db-repository";

export interface ConfigurationFormValues {
  name: string;
  symbol: string;
  code: string;
  denominations: string;
}

const emptyConfiguration: ConfigurationFormValues = {
  name: "", symbol: "", code: "", denominations: "",
};

interface RouteResult {
  page: "onboarding" | "dashboard" | "count" | "not-found";
  redirect?: string;
  status?: string;
}

interface SubmitResult {
  saved: boolean;
  values: ConfigurationFormValues;
  issues: readonly ValidationIssue[];
  configuration?: CurrencyConfiguration;
}

export function resolveRoute(
  path: string,
  configurations: readonly CurrencyConfiguration[],
): RouteResult {
  const [pathname, query = ""] = path.split("?", 2);
  const valid = configurations.length > 0
    && configurations.every((item) => validateCurrencyConfiguration(item).length === 0);
  if ((pathname === "/" || pathname === "/count/new") && !valid) {
    return {
      page: "onboarding",
      redirect: "/onboarding?reason=configuration",
      status: "Add a valid currency before starting a count.",
    };
  }
  if (pathname === "/") return { page: "dashboard" };
  if (pathname === "/onboarding") {
    return new URLSearchParams(query).get("reason") === "configuration"
      ? { page: "onboarding", status: "Add a valid currency before starting a count." }
      : { page: "onboarding" };
  }
  if (pathname === "/count/new") return { page: "count" };
  return { page: "not-found" };
}

export async function submitConfiguration(
  repository: Pick<IndexedDbRepository, "saveCurrencyConfigurations">,
  values: ConfigurationFormValues,
): Promise<SubmitResult> {
  const configuration: CurrencyConfiguration = {
    id: values.code.trim().toLowerCase(),
    name: values.name,
    symbol: values.symbol,
    code: values.code,
    denominations: values.denominations
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map(Number),
  };
  const issues = validateCurrencyConfiguration(configuration).filter((issue) => issue.field !== "id");
  if (issues.length > 0) return { saved: false, values, issues };
  await repository.saveCurrencyConfigurations([configuration]);
  return { saved: true, values, issues: [], configuration };
}

interface ConfigurationFormProps {
  values: ConfigurationFormValues;
  issues: readonly ValidationIssue[];
  onSubmit: (values: ConfigurationFormValues) => void;
}

export function ConfigurationForm({ values, issues, onSubmit }: ConfigurationFormProps) {
  const [draft, setDraft] = useState(values);
  const issueFor = (field: keyof ConfigurationFormValues) =>
    issues.find((issue) => issue.field === field);
  const field = (name: keyof ConfigurationFormValues, label: string) => {
    const issue = issueFor(name);
    const errorId = `${name}-error`;
    return (
      <div className="field">
        <label htmlFor={name}>{label}</label>
        <input
          id={name}
          name={name}
          value={draft[name]}
          aria-invalid={issue ? true : undefined}
          aria-describedby={issue ? errorId : undefined}
          onChange={(event) => setDraft({ ...draft, [name]: event.target.value })}
        />
        {issue && <span id={errorId} className="error" role="alert">{formatIssue(issue.message)}</span>}
      </div>
    );
  };
  return (
    <form onSubmit={(event: FormEvent) => { event.preventDefault(); onSubmit(draft); }} noValidate>
      {field("name", "Currency name")}
      {field("symbol", "Symbol")}
      {field("code", "Currency code")}
      {field("denominations", "Denominations (comma separated)")}
      <button type="submit">Save configuration</button>
    </form>
  );
}

export function ApplicationRoutes({ repository }: { repository: IndexedDbRepository }) {
  const [configurations, setConfigurations] = useState<readonly CurrencyConfiguration[] | null>(null);
  const [values, setValues] = useState<ConfigurationFormValues>(emptyConfiguration);
  const [issues, setIssues] = useState<readonly ValidationIssue[]>([]);
  const [loadError, setLoadError] = useState<string>();
  const [saveError, setSaveError] = useState<string>();
  useEffect(() => {
    void repository.getCurrencyConfigurations()
      .then(setConfigurations)
      .catch(() => setLoadError("Could not load local settings. Refresh and try again."));
  }, [repository]);

  const route = configurations
    ? resolveRoute(`${window.location.pathname}${window.location.search}`, configurations)
    : null;
  useEffect(() => {
    if (route?.redirect) window.history.replaceState({}, "", route.redirect);
  }, [route?.redirect]);
  if (loadError) return <LocalSettingsErrorPage message={loadError} />;
  if (!configurations || !route) {
    return <main className="app-shell"><p role="status">Loading local settings…</p></main>;
  }
  const save = async (draft: ConfigurationFormValues) => {
    setValues(draft);
    setSaveError(undefined);
    try {
      const result = await submitConfiguration(repository, draft);
      setIssues(result.issues);
      if (result.saved && result.configuration) {
        window.history.replaceState({}, "", "/");
        setConfigurations([result.configuration]);
      }
    } catch {
      setIssues([]);
      setSaveError("Could not save local settings. Try again.");
    }
  };
  if (route.page === "onboarding") {
    return <ConfigurationPage status={route.status} error={saveError}
      values={values} issues={issues} onSubmit={(draft) => void save(draft)} />;
  }
  if (route.page === "dashboard") return <Page title="Dashboard"><a className="button" href="/count/new">Start a count</a></Page>;
  if (route.page === "count") return <Page title="New count"><p>Your configured currency is ready.</p></Page>;
  return <Page title="Page not found"><a href="/">Return home</a></Page>;
}

function ConfigurationPage(props: ConfigurationFormProps & { status?: string; error?: string }) {
  const messageRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { messageRef.current?.focus(); }, [props.status, props.error]);
  return <Page title="Set up CYNDY">
    {props.error && <p ref={messageRef} className="error" role="alert" tabIndex={-1}>{props.error}</p>}
    {props.status && !props.error && <p ref={messageRef} className="status" role="status" tabIndex={-1}>{props.status}</p>}
    <p>Add one currency and its positive whole-number denominations.</p>
    <ConfigurationForm values={props.values} issues={props.issues} onSubmit={props.onSubmit} />
  </Page>;
}

export function LocalSettingsErrorPage({ message }: { message: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return <Page title="Local settings unavailable">
    <p ref={ref} className="error" role="alert" tabIndex={-1}>{message}</p>
  </Page>;
}

function Page({ title, children }: { title: string; children: React.ReactNode }) {
  return <main className="app-shell"><section className="card" aria-labelledby="page-title">
    <h1 id="page-title">{title}</h1>{children}
  </section></main>;
}

function formatIssue(message: string) {
  return `${message[0]?.toUpperCase()}${message.slice(1)}.`;
}
