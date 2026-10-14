import { useEffect, useRef, useState, type FormEvent } from "react";
import { calculateCountSnapshots, type CountQuantities } from "../domain/count";
import type { CurrencyConfiguration, ValidationIssue } from "../domain/validation";
import { validateCurrencyConfiguration } from "../domain/validation";
import type { CountRecord, IndexedDbRepository } from "../storage/indexed-db-repository";

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
  page: "onboarding" | "dashboard" | "count" | "history" | "detail" | "not-found";
  redirect?: string;
  status?: string;
  countId?: string;
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
  if (pathname === "/history") return { page: "history" };
  const detail = pathname.match(/^\/history\/([^/]+)$/);
  if (detail) {
    try {
      return { page: "detail", countId: decodeURIComponent(detail[1]) };
    } catch {
      return { page: "not-found" };
    }
  }
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
  const [notice, setNotice] = useState<string>();
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
    return <AppShell><ConfigurationPage status={notice ?? route.status} error={saveError}
      values={values} issues={issues}
      onChange={(index, draft) => setValues(values.map((item, itemIndex) =>
        itemIndex === index ? draft : item))}
      onAdd={() => setValues([...values, emptyConfiguration])}
      onSubmit={() => void save()} /></AppShell>;
  }
  if (route.page === "dashboard") return <AppShell><Dashboard repository={repository} onReset={() => {
    window.history.replaceState({}, "", "/onboarding");
    setNotice("All local data was reset.");
    setConfigurations([]);
  }} /></AppShell>;
  if (route.page === "count") return <AppShell><CountPage configurations={configurations} repository={repository} /></AppShell>;
  if (route.page === "history") return <AppShell><HistoryPage repository={repository} /></AppShell>;
  if (route.page === "detail") return <AppShell><CountDetailPage countId={route.countId!} repository={repository} /></AppShell>;
  return <AppShell><Page title="Page not found"><a href="/">Return home</a></Page></AppShell>;
}

function Dashboard({ repository, onReset }: {
  repository: IndexedDbRepository; onReset: () => void;
}) {
  const [data, setData] = useState<{
    latest?: CountRecord; counts: readonly CountRecord[];
  }>();
  const [error, setError] = useState(false);
  const [resetStage, setResetStage] = useState<0 | 1 | 2>(0);
  const [resetError, setResetError] = useState<string>();
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const resetErrorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    void repository.listCounts()
      .then((counts) => setData({ latest: counts[0], counts })).catch(() => setError(true));
  }, [repository]);
  useEffect(() => { resetErrorRef.current?.focus(); }, [resetError]);
  if (error) return <RecordsError />;
  if (!data) return <Page title="Dashboard"><p role="status">Loading saved counts…</p></Page>;
  const statistics = new Map<string, number>();
  for (const count of data.counts) {
    for (const snapshot of count.snapshots) {
      statistics.set(snapshot.code, (statistics.get(snapshot.code) ?? 0) + 1);
    }
  }
  return <Page title="Dashboard">
    <a className="button" href="/count/new">Start a count</a>{" "}<a href="/history">View history</a>
    <h2>Latest count</h2>
    {data.latest ? <>
      <CountTime record={data.latest} />
      <SnapshotSubtotals record={data.latest} />
      <a href={`/history/${encodeURIComponent(data.latest.id)}`}>View latest count</a>
    </> : <p>No saved counts yet.</p>}
    <h2>Local statistics</h2>
    <p>{data.counts.length} saved {data.counts.length === 1 ? "count" : "counts"}</p>
    <ul>{[...statistics].map(([code, count]) =>
      <li key={code}>{code}: {count} {count === 1 ? "count" : "counts"}</li>)}</ul>
    <h2>Local data</h2>
    {resetError && <p ref={resetErrorRef} className="error" role="alert" tabIndex={-1}>
      {resetError}
    </p>}
    {resetStage === 0 ? <button ref={resetButtonRef} type="button" onClick={() => {
      setResetError(undefined); setResetStage(1);
    }}>Reset all local data</button> : <ConfirmationPanel
      title={resetStage === 1 ? "Reset all local data?" : "Final reset confirmation"}
      description={resetStage === 1
        ? "This will permanently delete every saved count and all currency settings."
        : "This cannot be undone. Confirm once more to reset this device."}
      cancelLabel="Cancel reset"
      confirmLabel={resetStage === 1 ? "Continue reset" : "Confirm reset"}
      onCancel={() => {
        setResetStage(0); setTimeout(() => resetButtonRef.current?.focus());
      }}
      onConfirm={() => resetStage === 1 ? setResetStage(2) : void repository.resetAll()
        .then(onReset)
        .catch(() => {
          setResetStage(0);
          setResetError("Could not reset local data. Try again.");
        })}
    />}
  </Page>;
}

function HistoryPage({ repository }: { repository: IndexedDbRepository }) {
  const [counts, setCounts] = useState<readonly CountRecord[]>();
  const [error, setError] = useState(false);
  useEffect(() => {
    void repository.listCounts().then(setCounts).catch(() => setError(true));
  }, [repository]);
  if (error) return <RecordsError />;
  return <Page title="History">{counts ? (counts.length ? <ul>{counts.map((count) => <li key={count.id}>
    <CountTime record={count} /><SnapshotSubtotals record={count} />
    <a href={`/history/${encodeURIComponent(count.id)}`}>View count {count.id}</a>
  </li>)}</ul> : <p>No saved counts yet.</p>) : <p role="status">Loading history…</p>}</Page>;
}

function CountDetailPage({ countId, repository }: {
  countId: string; repository: IndexedDbRepository;
}) {
  const [record, setRecord] = useState<CountRecord | null>();
  const [error, setError] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string>();
  const [deleted, setDeleted] = useState(false);
  const deleteButtonRef = useRef<HTMLButtonElement>(null);
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    void repository.getCount(countId).then((count) => setRecord(count ?? null)).catch(() => setError(true));
  }, [countId, repository]);
  useEffect(() => { feedbackRef.current?.focus(); }, [deleteError, deleted]);
  if (error) return <RecordsError />;
  if (record === undefined) return <Page title="Count details"><p role="status">Loading count…</p></Page>;
  if (deleted) return <Page title="Count deleted"><p ref={feedbackRef} className="status"
    role="status" tabIndex={-1}>Count deleted.</p>
    <a href="/history">Return to history</a></Page>;
  if (record === null) return <Page title="Count not found"><a href="/history">Return to history</a></Page>;
  return <Page title="Count details">
    <CountTime record={record} />
    {record.snapshots.map((snapshot) => <section key={snapshot.currencyId}>
      <h2>{snapshot.name} ({snapshot.code})</h2>
      <ul>{snapshot.entries.map((entry) => <li key={entry.denomination}>
        {snapshot.symbol}{entry.denomination} × {entry.quantity} = {snapshot.symbol}{entry.total}
      </li>)}</ul>
      <p>Subtotal: {snapshot.symbol}{snapshot.subtotal} {snapshot.code}</p>
    </section>)}
    <h2>Note</h2><p>{record.note ?? "No note"}</p>
    {deleteError && <p ref={feedbackRef} className="error" role="alert" tabIndex={-1}>
      {deleteError}
    </p>}
    {confirmingDelete ? <ConfirmationPanel title="Delete this count?"
      description="Only this saved count will be permanently deleted."
      cancelLabel="Cancel deletion" confirmLabel="Confirm deletion"
      onCancel={() => {
        setConfirmingDelete(false); setTimeout(() => deleteButtonRef.current?.focus());
      }}
      onConfirm={() => void repository.deleteCount(record.id)
        .then(() => setDeleted(true))
        .catch(() => {
          setConfirmingDelete(false);
          setDeleteError("Could not delete the count. Try again.");
        })} />
      : <button ref={deleteButtonRef} type="button" onClick={() => {
        setDeleteError(undefined); setConfirmingDelete(true);
      }}>Delete this count</button>}
    {" "}
    <a href="/history">Return to history</a>
  </Page>;
}

function ConfirmationPanel({ title, description, cancelLabel, confirmLabel, onCancel, onConfirm }: {
  title: string; description: string; cancelLabel: string; confirmLabel: string;
  onCancel: () => void; onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const id = title.toLowerCase().replace(/\W+/g, "-");
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    cancelRef.current?.focus();
    return () => { if (dialog.open && typeof dialog.close === "function") dialog.close(); };
  }, [title]);
  return <dialog ref={dialogRef} className="confirmation" role="alertdialog"
    onCancel={(event) => { event.preventDefault(); onCancel(); }}
    aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}>
    <h3 id={`${id}-title`}>{title}</h3>
    <p id={`${id}-description`}>{description}</p>
    <div className="actions">
      <button ref={cancelRef} type="button" onClick={onCancel}>{cancelLabel}</button>
      <button className="danger" type="button" onClick={onConfirm}>{confirmLabel}</button>
    </div>
  </dialog>;
}

function CountTime({ record }: { record: CountRecord }) {
  return <time dateTime={record.createdAt}>{record.createdAt}</time>;
}

function SnapshotSubtotals({ record }: { record: CountRecord }) {
  return <ul>{record.snapshots.map((snapshot) => <li key={snapshot.currencyId}>
    {snapshot.symbol}{snapshot.subtotal} {snapshot.code}
  </li>)}</ul>;
}

function RecordsError() {
  return <Page title="Saved counts unavailable"><p className="error" role="alert">
    Could not load saved counts. Refresh and try again.
  </p></Page>;
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
        <a href="/history">History</a>
      </nav>
    </header>
    <main id="main-content" className="app-shell" tabIndex={-1}>{children}</main>
  </>;
}

function formatIssue(message: string) {
  return `${message[0]?.toUpperCase()}${message.slice(1)}.`;
}
