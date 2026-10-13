import { useEffect, useRef, useState, type FormEvent } from "react";
import { calculateCountSnapshots, type CountQuantities } from "../domain/count";
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

interface MultiSubmitResult {
  saved: boolean;
  issues: readonly (readonly ValidationIssue[])[];
  configurations?: readonly CurrencyConfiguration[];
}

export function resolveRoute(
  path: string,
  configurations: readonly CurrencyConfiguration[],
): RouteResult {
  const [pathname, query = ""] = path.split("?", 2);
  const valid = configurations.length > 0
    && configurations.every((item) => validateCurrencyConfiguration(item).length === 0)
    && findDuplicateCurrencyIndexes(configurations).size === 0;
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
  const result = await submitConfigurations(repository, [values]);
  return {
    saved: result.saved,
    values,
    issues: result.issues[0] ?? [],
    configuration: result.configurations?.[0],
  };
}

async function submitConfigurations(
  repository: Pick<IndexedDbRepository, "saveCurrencyConfigurations">,
  values: readonly ConfigurationFormValues[],
): Promise<MultiSubmitResult> {
  const configurations = values.map((item): CurrencyConfiguration => ({
    id: item.code.trim().toLowerCase(),
    name: item.name,
    symbol: item.symbol,
    code: item.code,
    denominations: item.denominations
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map(Number),
  }));
  const issues = configurations.map((configuration) =>
    validateCurrencyConfiguration(configuration).filter((issue) => issue.field !== "id"));
  for (const index of findDuplicateCurrencyIndexes(configurations)) {
    issues[index].push({ field: "code", message: "currency codes must be unique" });
  }
  if (issues.some((item) => item.length > 0)) return { saved: false, issues };
  await repository.saveCurrencyConfigurations(configurations);
  return { saved: true, issues, configurations };
}

function findDuplicateCurrencyIndexes(
  configurations: readonly CurrencyConfiguration[],
): ReadonlySet<number> {
  const normalizedIds = configurations.map((configuration) => configuration.id.trim().toLowerCase());
  const normalizedCodes = configurations.map((configuration) => configuration.code.trim().toLowerCase());
  return new Set(configurations.flatMap((_configuration, index) => {
    const id = normalizedIds[index];
    const code = normalizedCodes[index];
    const duplicateId = id.length > 0 && normalizedIds.indexOf(id) !== normalizedIds.lastIndexOf(id);
    const duplicateCode = code.length > 0
      && normalizedCodes.indexOf(code) !== normalizedCodes.lastIndexOf(code);
    return duplicateId || duplicateCode ? [index] : [];
  }));
}

interface ConfigurationFormProps {
  values: ConfigurationFormValues;
  issues: readonly ValidationIssue[];
  index: number;
  onChange: (values: ConfigurationFormValues) => void;
}

export function ConfigurationForm({ values, issues, index, onChange }: ConfigurationFormProps) {
  const issueFor = (field: keyof ConfigurationFormValues) =>
    issues.find((issue) => issue.field === field);
  const field = (name: keyof ConfigurationFormValues, label: string) => {
    const issue = issueFor(name);
    const inputId = `currency-${index}-${name}`;
    const errorId = `${inputId}-error`;
    return (
      <div className="field">
        <label htmlFor={inputId}>{label}</label>
        <input
          id={inputId}
          name={name}
          value={values[name]}
          aria-invalid={issue ? true : undefined}
          aria-describedby={issue ? errorId : undefined}
          onChange={(event) => onChange({ ...values, [name]: event.target.value })}
        />
        {issue && <span id={errorId} className="error" role="alert">{formatIssue(issue.message)}</span>}
      </div>
    );
  };
  return (
    <fieldset>
      <legend>Currency {index + 1}</legend>
      {field("name", "Currency name")}
      {field("symbol", "Symbol")}
      {field("code", "Currency code")}
      {field("denominations", "Denominations (comma separated)")}
    </fieldset>
  );
}

export function ApplicationRoutes({ repository }: { repository: IndexedDbRepository }) {
  const [configurations, setConfigurations] = useState<readonly CurrencyConfiguration[] | null>(null);
  const [values, setValues] = useState<readonly ConfigurationFormValues[]>([emptyConfiguration]);
  const [issues, setIssues] = useState<readonly (readonly ValidationIssue[])[]>([[]]);
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
    return <AppShell><p role="status">Loading local settings…</p></AppShell>;
  }
  const save = async () => {
    setSaveError(undefined);
    try {
      const result = await submitConfigurations(repository, values);
      setIssues(result.issues);
      if (result.saved && result.configurations) {
        window.history.replaceState({}, "", "/");
        setConfigurations(result.configurations);
      }
    } catch {
      setIssues([]);
      setSaveError("Could not save local settings. Try again.");
    }
  };
  if (route.page === "onboarding") {
    return <AppShell><ConfigurationPage status={route.status} error={saveError}
      values={values} issues={issues}
      onChange={(index, draft) => setValues(values.map((item, itemIndex) =>
        itemIndex === index ? draft : item))}
      onAdd={() => setValues([...values, emptyConfiguration])}
      onSubmit={() => void save()} /></AppShell>;
  }
  if (route.page === "dashboard") return <AppShell><Page title="Dashboard"><a className="button" href="/count/new">Start a count</a></Page></AppShell>;
  if (route.page === "count") return <AppShell><CountPage configurations={configurations} repository={repository} /></AppShell>;
  return <AppShell><Page title="Page not found"><a href="/">Return home</a></Page></AppShell>;
}

interface ConfigurationPageProps {
  values: readonly ConfigurationFormValues[];
  issues: readonly (readonly ValidationIssue[])[];
  status?: string;
  error?: string;
  onChange: (index: number, values: ConfigurationFormValues) => void;
  onAdd: () => void;
  onSubmit: () => void;
}

function ConfigurationPage(props: ConfigurationPageProps) {
  const messageRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { messageRef.current?.focus(); }, [props.status, props.error]);
  return <Page title="Set up CYNDY">
    {props.error && <p ref={messageRef} className="error" role="alert" tabIndex={-1}>{props.error}</p>}
    {props.status && !props.error && <p ref={messageRef} className="status" role="status" tabIndex={-1}>{props.status}</p>}
    <p>Add up to two currencies and their positive whole-number denominations.</p>
    <form onSubmit={(event: FormEvent) => { event.preventDefault(); props.onSubmit(); }} noValidate>
      {props.values.map((values, index) => <ConfigurationForm key={index}
        values={values} issues={props.issues[index] ?? []} index={index}
        onChange={(draft) => props.onChange(index, draft)} />)}
      {props.values.length < 2 && <button type="button" onClick={props.onAdd}>Add another currency</button>}
      <button type="submit">Save configuration</button>
    </form>
  </Page>;
}

function CountPage({ configurations, repository }: {
  configurations: readonly CurrencyConfiguration[];
  repository: Pick<IndexedDbRepository, "saveCount">;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string>();
  const quantities = toQuantities(configurations, draft, false);
  const snapshots = calculateCountSnapshots(configurations, quantities);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const checked = toQuantities(configurations, draft, true);
      await repository.saveCount({
        snapshots: calculateCountSnapshots(configurations, checked),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setMessage("Count saved.");
    } catch (error) {
      setMessage(error instanceof TypeError
        ? "Quantities must be non-negative integers."
        : "Could not save the count. Try again.");
    }
  };

  return <Page title="New count"><form onSubmit={(event) => void save(event)} noValidate>
    {configurations.map((configuration, currencyIndex) => <fieldset key={configuration.id}>
      <legend>{configuration.name} ({configuration.code})</legend>
      {configuration.denominations.map((denomination) => {
        const key = `${configuration.id}:${denomination}`;
        return <div className="field" key={key}>
          <label htmlFor={key}>{configuration.symbol}{denomination} quantity</label>
          <input id={key} type="number" min="0" step="1" inputMode="numeric"
            value={draft[key] ?? ""}
            onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
        </div>;
      })}
      <p>Subtotal: <strong>{configuration.symbol}{snapshots[currencyIndex].subtotal} {configuration.code}</strong></p>
    </fieldset>)}
    <div className="field"><label htmlFor="count-note">Note (optional)</label>
      <input id="count-note" value={note} onChange={(event) => setNote(event.target.value)} />
    </div>
    {message && <p className={message === "Count saved." ? "status" : "error"}
      role={message === "Count saved." ? "status" : "alert"}>{message}</p>}
    <button type="submit">Save count</button>
  </form></Page>;
}

function toQuantities(
  configurations: readonly CurrencyConfiguration[],
  draft: Readonly<Record<string, string>>,
  strict: boolean,
): CountQuantities {
  return Object.fromEntries(configurations.map((configuration) => [configuration.id,
    Object.fromEntries(configuration.denominations.map((denomination) => {
      const value = draft[`${configuration.id}:${denomination}`] ?? "";
      const quantity = value === "" ? 0 : Number(value);
      if (strict && value !== "" && (!/^\d+$/.test(value) || !Number.isSafeInteger(quantity))) {
        throw new TypeError("Quantities must be non-negative integers");
      }
      return [String(denomination), Number.isSafeInteger(quantity) && quantity >= 0 ? quantity : 0];
    })),
  ]));
}

export function LocalSettingsErrorPage({ message }: { message: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return <AppShell><Page title="Local settings unavailable">
    <p ref={ref} className="error" role="alert" tabIndex={-1}>{message}</p>
  </Page></AppShell>;
}

function Page({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="card" aria-labelledby="page-title">
    <h1 id="page-title">{title}</h1>{children}
  </section>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  return <>
    <a className="skip-link" href="#main-content" onClick={(event) => {
      event.preventDefault();
      document.getElementById("main-content")?.focus();
    }}>
      Skip to main content
    </a>
    <header className="app-header">
      <a className="brand" href="/" aria-label="CYNDY home">CYNDY</a>
      <nav aria-label="Primary navigation">
        <a href="/">Home</a>
        <a href="/count/new">New count</a>
      </nav>
    </header>
    <main id="main-content" className="app-shell" tabIndex={-1}>{children}</main>
  </>;
}

function formatIssue(message: string) {
  return `${message[0]?.toUpperCase()}${message.slice(1)}.`;
}
