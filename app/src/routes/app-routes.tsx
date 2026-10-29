import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { calculateCountSnapshots, type CountQuantities } from "../domain/count";
import type { CurrencyConfiguration, ValidationIssue } from "../domain/validation";
import { validateCurrencyConfiguration } from "../domain/validation";
import {
  BrowserPrintDestination,
  type ReceiptDestination,
} from "../receipts/receipt-destination";
import { ReceiptView } from "../receipts/receipt-view";
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

type Locale = "en" | "es";
const LocaleContext = createContext<Locale>("en");

function readOptionalPreference(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeOptionalPreference(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Theme and locale preferences must not block local-only routes.
  }
}

const spanish: Readonly<Record<string, string>> = {
  "Skip to main content": "Saltar al contenido principal",
  "CYNDY home": "Inicio de CYNDY",
  "Loading local settings…": "Cargando ajustes locales…",
  "Add a valid currency before starting a count.": "Agrega una moneda válida antes de iniciar un conteo.",
  "Set up CYNDY": "Configura CYNDY",
  "Dashboard": "Panel principal",
  "New count": "Nuevo conteo",
  "Settings": "Ajustes",
  "History": "Historial",
  "Page not found": "Página no encontrada",
  "Return home": "Volver al inicio",
  "Saved counts unavailable": "Conteos guardados no disponibles",
  "Could not load saved counts. Refresh and try again.": "No se pudieron cargar los conteos guardados. Actualiza e inténtalo de nuevo.",
  "Local dashboard": "Panel local",
  "Review saved counts on this device.": "Revisa los conteos guardados en este dispositivo.",
  "Start a count": "Iniciar un conteo",
  "Latest count": "Último conteo",
  "View latest count": "Ver último conteo",
  "No saved counts yet.": "Aún no hay conteos guardados.",
  "Local statistics": "Estadísticas locales",
  "Local data": "Datos locales",
  "Reset all local data": "Restablecer todos los datos locales",
  "Reset all local data?": "¿Restablecer todos los datos locales?",
  "Final reset confirmation": "Confirmación final de restablecimiento",
  "This will permanently delete every saved count and all currency settings.": "Esto eliminará permanentemente todos los conteos guardados y los ajustes de moneda.",
  "This cannot be undone. Confirm once more to reset this device.": "Esta acción no se puede deshacer. Confirma una vez más para restablecer este dispositivo.",
  "Cancel reset": "Cancelar restablecimiento",
  "Continue reset": "Continuar restablecimiento",
  "Confirm reset": "Confirmar restablecimiento",
  "Local history": "Historial local",
  "Saved on this device, newest first. Totals remain separate by currency.": "Guardados en este dispositivo, del más reciente al más antiguo. Los totales permanecen separados por moneda.",
  "Saved local counts": "Conteos locales guardados",
  "No saved counts yet": "Aún no hay conteos guardados",
  "Counts saved on this device will appear here. Start a count when you are ready.": "Los conteos guardados en este dispositivo aparecerán aquí. Inicia un conteo cuando estés listo.",
  "Loading history…": "Cargando historial…",
  "Count details": "Detalles del conteo",
  "Loading count…": "Cargando conteo…",
  "Count deleted": "Conteo eliminado",
  "Count deleted.": "Conteo eliminado.",
  "Count not found": "Conteo no encontrado",
  "Return to history": "Volver al historial",
  "Note": "Nota",
  "No note": "Sin nota",
  "Open receipt": "Abrir recibo",
  "Delete this count": "Eliminar este conteo",
  "Delete this count?": "¿Eliminar este conteo?",
  "Only this saved count will be permanently deleted.": "Solo este conteo guardado se eliminará permanentemente.",
  "Cancel deletion": "Cancelar eliminación",
  "Confirm deletion": "Confirmar eliminación",
  "Count receipt": "Recibo del conteo",
  "Loading receipt…": "Cargando recibo…",
  "Currency": "Moneda",
  "Currency name": "Nombre de la moneda",
  "Symbol": "Símbolo",
  "Currency code": "Código de moneda",
  "Denominations (comma separated)": "Denominaciones (separadas por comas)",
  "Add another currency": "Agregar otra moneda",
  "Save configuration": "Guardar configuración",
  "Save settings": "Guardar ajustes",
  "Local settings": "Ajustes locales",
  "Note (optional)": "Nota (opcional)",
  "Save count": "Guardar conteo",
  "Clear unsaved count": "Limpiar conteo sin guardar",
  "Loading saved counts…": "Cargando conteos guardados…",
  "View count": "Ver conteo",
  "Add up to two currencies and their positive whole-number denominations.": "Agrega hasta dos monedas y sus denominaciones enteras positivas.",
  "Edit the currencies and positive whole-number denominations used by future counts.": "Edita las monedas y denominaciones enteras positivas usadas en conteos futuros.",
  "Changes apply to future counts. Saved counts keep their original values.": "Los cambios se aplican a conteos futuros. Los conteos guardados conservan sus valores originales.",
  "Could not load local settings. Refresh and try again.": "No se pudieron cargar los ajustes locales. Actualiza e inténtalo de nuevo.",
  "Local settings unavailable": "Ajustes locales no disponibles",
  "Could not save local settings. Try again.": "No se pudieron guardar los ajustes locales. Inténtalo de nuevo.",
  "All local data was reset.": "Se restablecieron todos los datos locales.",
  "Could not reset local data. Try again.": "No se pudieron restablecer los datos locales. Inténtalo de nuevo.",
  "Could not delete the count. Try again.": "No se pudo eliminar el conteo. Inténtalo de nuevo.",
  "Settings saved.": "Ajustes guardados.",
  "Quantities must be non-negative integers.": "Las cantidades deben ser enteros no negativos.",
  "Count saved.": "Conteo guardado.",
  "Could not save the count. Try again.": "No se pudo guardar el conteo. Inténtalo de nuevo.",
  "name is required": "el nombre es obligatorio",
  "symbol is required": "el símbolo es obligatorio",
  "code is required": "el código es obligatorio",
  "at least one denomination is required": "se requiere al menos una denominación",
  "denominations must be positive integers": "las denominaciones deben ser enteros positivos",
  "denominations must be unique": "las denominaciones deben ser únicas",
  "currency codes must be unique": "los códigos de moneda deben ser únicos",
  "quantity": "cantidad",
  "Subtotal": "Subtotal",
  "Enter a non-negative whole number within the safe integer range.": "Ingresa un número entero no negativo dentro del rango seguro.",
  "saved": "guardado",
  "count": "conteo",
  "counts": "conteos",
  "total": "total",
};

function useText() {
  const locale = useContext(LocaleContext);
  return (text: string) => locale === "es" ? spanish[text] ?? text : text;
}

interface RouteResult {
  page: "onboarding" | "dashboard" | "count" | "settings" | "history" | "detail" | "receipt" | "not-found";
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

interface CountDraftState {
  readonly quantities: Readonly<Record<string, string>>;
  readonly note: string;
  readonly message?: string;
  readonly invalidQuantityKeys: ReadonlySet<string>;
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
  if (pathname === "/settings") return { page: "settings" };
  if (pathname === "/history") return { page: "history" };
  const receipt = pathname.match(/^\/history\/([^/]+)\/receipt$/);
  if (receipt) {
    try {
      return { page: "receipt", countId: decodeURIComponent(receipt[1]) };
    } catch {
      return { page: "not-found" };
    }
  }
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
  const t = useText();
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
        {issue && <span id={errorId} className="error field-error" role="alert">{formatIssue(t(issue.message))}</span>}
      </div>
    );
  };
  return (
    <fieldset>
      <legend>{t("Currency")} {index + 1}</legend>
      {field("name", t("Currency name"))}
      {field("symbol", t("Symbol"))}
      {field("code", t("Currency code"))}
      {field("denominations", t("Denominations (comma separated)"))}
    </fieldset>
  );
}

const browserPrintDestination = new BrowserPrintDestination();

export function ApplicationRoutes({ repository, receiptDestination = browserPrintDestination }: {
  repository: IndexedDbRepository;
  receiptDestination?: ReceiptDestination;
}) {
  const [configurations, setConfigurations] = useState<readonly CurrencyConfiguration[] | null>(null);
  const [values, setValues] = useState<readonly ConfigurationFormValues[]>([emptyConfiguration]);
  const [issues, setIssues] = useState<readonly (readonly ValidationIssue[])[]>([[]]);
  const [loadError, setLoadError] = useState<string>();
  const [saveError, setSaveError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [path, setPath] = useState(() => `${window.location.pathname}${window.location.search}`);
  const [countDraft, setCountDraft] = useState<CountDraftState>({
    quantities: {}, note: "", invalidQuantityKeys: new Set(),
  });
  useEffect(() => {
    void repository.getCurrencyConfigurations()
      .then(setConfigurations)
      .catch(() => setLoadError("Could not load local settings. Refresh and try again."));
  }, [repository]);
  useEffect(() => {
    const syncPath = () => setPath(`${window.location.pathname}${window.location.search}`);
    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, []);

  const route = configurations
    ? resolveRoute(path, configurations)
    : null;
  useEffect(() => {
    if (route?.redirect) replaceLocation(route.redirect);
  }, [route?.redirect]);
  if (loadError) return <LocalSettingsErrorPage message={loadError} />;
  if (!configurations || !route) {
    return <AppShell><LocalizedText role="status" text="Loading local settings…" /></AppShell>;
  }
  const save = async () => {
    setSaveError(undefined);
    try {
      const result = await submitConfigurations(repository, values);
      setIssues(result.issues);
      if (result.saved && result.configurations) {
        replaceLocation("/");
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
    replaceLocation("/onboarding");
    setNotice("All local data was reset.");
    setValues([emptyConfiguration]);
    setIssues([[]]);
    setSaveError(undefined);
    setConfigurations([]);
  }} /></AppShell>;
  if (route.page === "count") return <AppShell><CountPage configurations={configurations}
    repository={repository} state={countDraft} onChange={setCountDraft} /></AppShell>;
  if (route.page === "settings") return <AppShell><SettingsPage configurations={configurations}
    repository={repository} onSaved={setConfigurations} /></AppShell>;
  if (route.page === "history") return <AppShell><HistoryPage repository={repository} /></AppShell>;
  if (route.page === "detail") return <AppShell><CountDetailPage countId={route.countId!} repository={repository} /></AppShell>;
  if (route.page === "receipt") return <AppShell><ReceiptPage countId={route.countId!}
    repository={repository} destination={receiptDestination} /></AppShell>;
  return <AppShell><Page title="Page not found"><ReturnHomeLink /></Page></AppShell>;
}

function Dashboard({ repository, onReset }: {
  repository: IndexedDbRepository; onReset: () => void;
}) {
  const t = useText();
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
  if (!data) return <Page title="Dashboard"><p role="status">{t("Loading saved counts…")}</p></Page>;
  const statistics = new Map<string, number>();
  for (const count of data.counts) {
    for (const snapshot of count.snapshots) {
      statistics.set(snapshot.code, (statistics.get(snapshot.code) ?? 0) + 1);
    }
  }
  return <Page title="Dashboard">
    <p className="eyebrow">{t("Local dashboard")}</p>
    <p className="dashboard-intro">{t("Review saved counts on this device.")}</p>
    <a className="button dashboard-start" href="/count/new">{t("Start a count")}</a>
    <section className="dashboard-section" aria-labelledby="latest-count-title"><h2 id="latest-count-title">{t("Latest count")}</h2>
    {data.latest ? <article className="dashboard-card">
      <CountTime record={data.latest} />
      <SnapshotSubtotals record={data.latest} />
      <a href={`/history/${encodeURIComponent(data.latest.id)}`}>{t("View latest count")}</a>
    </article> : <p>{t("No saved counts yet.")}</p>}</section>
    <section className="dashboard-section" aria-labelledby="local-statistics-title"><h2 id="local-statistics-title">{t("Local statistics")}</h2>
    <article className="dashboard-card"><p>{data.counts.length} {t("saved")} {t(data.counts.length === 1 ? "count" : "counts")}</p>
    <ul>{[...statistics].map(([code, count]) =>
      <li key={code}>{code}: {count} {t(count === 1 ? "count" : "counts")}</li>)}</ul></article></section>
    <section className="dashboard-section dashboard-data" aria-labelledby="local-data-title"><h2 id="local-data-title">{t("Local data")}</h2>
    {resetError && <p ref={resetErrorRef} className="error" role="alert" tabIndex={-1}>
      {t(resetError)}
    </p>}
    {resetStage === 0 ? <button ref={resetButtonRef} className="dashboard-reset-button" type="button" onClick={() => {
      setResetError(undefined); setResetStage(1);
    }}>{t("Reset all local data")}</button> : <ConfirmationPanel
      variant="reset"
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
    />}</section>
  </Page>;
}

function HistoryPage({ repository }: { repository: IndexedDbRepository }) {
  const t = useText();
  const [counts, setCounts] = useState<readonly CountRecord[]>();
  const [error, setError] = useState(false);
  useEffect(() => {
    void repository.listCounts().then(setCounts).catch(() => setError(true));
  }, [repository]);
  if (error) return <RecordsError />;
  return <Page title="History">
    <p className="eyebrow">{t("Local history")}</p>
    {counts ? (counts.length ? <>
      <p className="history-intro">{t("Saved on this device, newest first. Totals remain separate by currency.")}</p>
      <ul className="history-list" aria-label={t("Saved local counts")}> {counts.map((count) => <li key={count.id}>
        <article className="history-record-card">
          <CountTime record={count} className="history-record-date" />
          <SnapshotSubtotals record={count} className="history-subtotals" />
          <a className="history-record-link" href={`/history/${encodeURIComponent(count.id)}`}>{t("View count")} {count.id}<span aria-hidden="true">→</span></a>
        </article>
      </li>)}</ul>
    </> : <section className="history-empty-state" aria-labelledby="empty-history-title">
      <span className="history-empty-symbol" aria-hidden="true">◷</span>
      <div><h2 id="empty-history-title">{t("No saved counts yet")}</h2>
        <p>{t("Counts saved on this device will appear here. Start a count when you are ready.")}</p></div>
      <a className="button history-empty-action" href="/count/new">{t("Start a count")}<span aria-hidden="true">→</span></a>
    </section>) : <p role="status">{t("Loading history…")}</p>}
  </Page>;
}

function CountDetailPage({ countId, repository }: {
  countId: string; repository: IndexedDbRepository;
}) {
  const t = useText();
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
  if (record === undefined) return <Page title="Count details"><p role="status">{t("Loading count…")}</p></Page>;
  if (deleted) return <Page title="Count deleted"><p ref={feedbackRef} className="status"
    role="status" tabIndex={-1}>{t("Count deleted.")}</p>
    <a href="/history">{t("Return to history")}</a></Page>;
  if (record === null) return <Page title="Count not found"><a href="/history">{t("Return to history")}</a></Page>;
  return <Page title="Count details">
    <CountTime record={record} />
    {record.snapshots.map((snapshot) => <section key={snapshot.currencyId}>
      <h2>{snapshot.name} ({snapshot.code})</h2>
      <ul>{snapshot.entries.map((entry) => <li key={entry.denomination}>
        {snapshot.symbol}{entry.denomination} × {entry.quantity} = {snapshot.symbol}{entry.total}
      </li>)}</ul>
      <p>{t("Subtotal")}: {snapshot.symbol}{snapshot.subtotal} {snapshot.code}</p>
    </section>)}
    <h2>{t("Note")}</h2><p>{record.note ?? t("No note")}</p>
    <a href={`/history/${encodeURIComponent(record.id)}/receipt`}>{t("Open receipt")}</a>{" "}
    {deleteError && <p ref={feedbackRef} className="error" role="alert" tabIndex={-1}>
      {t(deleteError)}
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
      }}>{t("Delete this count")}</button>}
    {" "}
    <a href="/history">{t("Return to history")}</a>
  </Page>;
}

function ReceiptPage({ countId, repository, destination }: {
  countId: string;
  repository: IndexedDbRepository;
  destination: ReceiptDestination;
}) {
  const t = useText();
  const [record, setRecord] = useState<CountRecord | null>();
  const [error, setError] = useState(false);
  useEffect(() => {
    void repository.getCount(countId).then((count) => setRecord(count ?? null)).catch(() => setError(true));
  }, [countId, repository]);
  if (error) return <RecordsError />;
  if (record === undefined) return <Page title="Count receipt"><p role="status">{t("Loading receipt…")}</p></Page>;
  if (record === null) return <Page title="Count not found"><a href="/history">{t("Return to history")}</a></Page>;
  return <Page title="Count receipt"><ReceiptView record={record} destination={destination} /></Page>;
}

function ConfirmationPanel({ title, description, cancelLabel, confirmLabel, onCancel, onConfirm, variant }: {
  title: string; description: string; cancelLabel: string; confirmLabel: string;
  onCancel: () => void; onConfirm: () => void; variant?: "reset";
}) {
  const t = useText();
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
  return <dialog ref={dialogRef} className={`confirmation${variant ? ` confirmation--${variant}` : ""}`} role="alertdialog"
    onCancel={(event) => { event.preventDefault(); onCancel(); }}
    aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}>
    {variant === "reset" && <p className="danger-kicker">{t("Local data")}</p>}
    <h3 id={`${id}-title`}>{t(title)}</h3>
    <p id={`${id}-description`}>{t(description)}</p>
    <div className={variant === "reset" ? "dialog-actions" : "actions"}>
      <button ref={cancelRef} type="button" onClick={onCancel}>{t(cancelLabel)}</button>
      <button className="danger" type="button" onClick={onConfirm}>{t(confirmLabel)}</button>
    </div>
  </dialog>;
}

function CountTime({ record, className }: { record: CountRecord; className?: string }) {
  return <time className={className} dateTime={record.createdAt}>{record.createdAt}</time>;
}

function SnapshotSubtotals({ record, className }: { record: CountRecord; className?: string }) {
  return <ul className={className}>{record.snapshots.map((snapshot) => <li key={snapshot.currencyId}>
    {snapshot.symbol}{snapshot.subtotal} {snapshot.code}
  </li>)}</ul>;
}

function RecordsError() {
  const t = useText();
  return <Page title="Saved counts unavailable"><p className="error" role="alert">
    {t("Could not load saved counts. Refresh and try again.")}
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
  const t = useText();
  const messageRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => { messageRef.current?.focus(); }, [props.status, props.error]);
  return <Page title="Set up CYNDY">
    {props.error && <p ref={messageRef} className="error" role="alert" tabIndex={-1}>{t(props.error)}</p>}
    {props.status && !props.error && <p ref={messageRef} className="status" role="status" tabIndex={-1}>{t(props.status)}</p>}
    <p>{t("Add up to two currencies and their positive whole-number denominations.")}</p>
    <form onSubmit={(event: FormEvent) => { event.preventDefault(); props.onSubmit(); }} noValidate>
      {props.values.map((values, index) => <ConfigurationForm key={index}
        values={values} issues={props.issues[index] ?? []} index={index}
        onChange={(draft) => props.onChange(index, draft)} />)}
      {props.values.length < 2 && <button type="button" onClick={props.onAdd}>{t("Add another currency")}</button>}
      <button type="submit">{t("Save configuration")}</button>
    </form>
  </Page>;
}

function SettingsPage({ configurations, repository, onSaved }: {
  configurations: readonly CurrencyConfiguration[];
  repository: Pick<IndexedDbRepository, "saveCurrencyConfigurations">;
  onSaved: (configurations: readonly CurrencyConfiguration[]) => void;
}) {
  const t = useText();
  const [values, setValues] = useState<readonly ConfigurationFormValues[]>(() =>
    configurations.length > 0 ? configurations.map((configuration) => ({
      name: configuration.name,
      symbol: configuration.symbol,
      code: configuration.code,
      denominations: configuration.denominations.join(", "),
    })) : [emptyConfiguration]);
  const [issues, setIssues] = useState<readonly (readonly ValidationIssue[])[]>([[]]);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);
  const messageRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
  }, [issues]);
  useEffect(() => { messageRef.current?.focus(); }, [message, error]);

  const save = async () => {
    setMessage(undefined);
    setError(undefined);
    try {
      const result = await submitConfigurations(repository, values);
      setIssues(result.issues);
      if (result.saved && result.configurations) {
        onSaved(result.configurations);
        setMessage("Settings saved.");
      }
    } catch {
      setIssues([]);
      setError("Could not save local settings. Try again.");
    }
  };

  return <Page title="Settings" className="settings-page">
    <p className="eyebrow">{t("Local settings")}</p>
    <p className="settings-intro">{t("Edit the currencies and positive whole-number denominations used by future counts.")}</p>
    {error && <p ref={messageRef} className="error" role="alert" tabIndex={-1}>{t(error)}</p>}
    {message && !error && <p ref={messageRef} className="status" role="status" tabIndex={-1}>{t(message)}</p>}
    <form ref={formRef} onSubmit={(event: FormEvent) => { event.preventDefault(); void save(); }} noValidate>
      {values.map((item, index) => <ConfigurationForm key={index} values={item}
        issues={issues[index] ?? []} index={index}
        onChange={(draft) => {
          setValues(values.map((value, itemIndex) => itemIndex === index ? draft : value));
          setMessage(undefined);
        }} />)}
      <div className="settings-actions">
        {values.length < 2 && <button type="button"
          onClick={() => {
            setValues([...values, emptyConfiguration]);
            setMessage(undefined);
          }}>{t("Add another currency")}</button>}
        <button type="submit">{t("Save settings")}</button>
      </div>
      <p className="settings-repair-note">{t("Changes apply to future counts. Saved counts keep their original values.")}</p>
    </form>
  </Page>;
}

function CountPage({ configurations, repository, state, onChange }: {
  configurations: readonly CurrencyConfiguration[];
  repository: Pick<IndexedDbRepository, "saveCount">;
  state: CountDraftState;
  onChange: (update: CountDraftState | ((state: CountDraftState) => CountDraftState)) => void;
}) {
  const t = useText();
  const { quantities: draft, note, message, invalidQuantityKeys } = state;
  const quantities = toQuantities(configurations, draft, false);
  const snapshots = calculateCountSnapshots(configurations, quantities);

  const clear = () => {
    onChange({ quantities: {}, note: "", invalidQuantityKeys: new Set() });
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const invalidKeys = new Set(configurations.flatMap((configuration) =>
      configuration.denominations.map((denomination) => `${configuration.id}:${denomination}`)
        .filter((key) => isInvalidQuantity(draft[key] ?? ""))));
    if (invalidKeys.size > 0) {
      onChange({ ...state, invalidQuantityKeys: invalidKeys,
        message: "Quantities must be non-negative integers." });
      return;
    }
    onChange({ ...state, invalidQuantityKeys: invalidKeys });
    try {
      const checked = toQuantities(configurations, draft, true);
      await repository.saveCount({
        snapshots: calculateCountSnapshots(configurations, checked),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      onChange((current) => ({ ...current, invalidQuantityKeys: invalidKeys,
        message: "Count saved." }));
    } catch (error) {
      onChange((current) => ({ ...current, invalidQuantityKeys: invalidKeys,
        message: error instanceof TypeError
        ? "Quantities must be non-negative integers."
        : "Could not save the count. Try again." }));
    }
  };

  return <Page title="New count"><form onSubmit={(event) => void save(event)} noValidate>
    {configurations.map((configuration, currencyIndex) =>
      <fieldset className="currency-fieldset" key={configuration.id}>
      <legend>{configuration.name} ({configuration.code})</legend>
      <p className="currency-total">{configuration.code} {t("total")}: <strong>
        {configuration.symbol}{snapshots[currencyIndex].subtotal} {configuration.code}
      </strong></p>
      {snapshots[currencyIndex].entries.map((entry) => {
        const key = `${configuration.id}:${entry.denomination}`;
        const subtotalId = `${key}-subtotal`;
        const subtotalDescriptionId = `${subtotalId}-description`;
        const errorId = `${key}-error`;
        const invalid = invalidQuantityKeys.has(key);
        return <div className="denomination-row" key={key}>
          <label className="denomination-value" htmlFor={key}>{entry.denomination}</label>
          <span className="row-operator" aria-hidden="true">×</span>
          <input id={key} type="number" min="0" step="1" inputMode="numeric"
            aria-label={`${configuration.symbol}${entry.denomination} ${t("quantity")}`}
            aria-invalid={invalid ? true : undefined}
            aria-describedby={`${subtotalDescriptionId}${invalid ? ` ${errorId}` : ""}`}
            value={draft[key] ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              onChange({ ...state, quantities: { ...draft, [key]: value },
                invalidQuantityKeys: invalid && !isInvalidQuantity(value)
                  ? new Set([...invalidQuantityKeys].filter((item) => item !== key))
                  : invalidQuantityKeys });
            }} />
          <span className="row-operator" aria-hidden="true">=</span>
          <span id={subtotalId} className="denomination-subtotal">{entry.total}</span>
          <span id={subtotalDescriptionId} className="visually-hidden">
            {t("Subtotal")}: {configuration.symbol}{entry.total} {configuration.code}
          </span>
          {invalid && <span id={errorId} className="error">
            {t("Enter a non-negative whole number within the safe integer range.")}
          </span>}
        </div>;
      })}
    </fieldset>)}
    <div className="field"><label htmlFor="count-note">{t("Note (optional)")}</label>
      <input id="count-note" value={note}
        onChange={(event) => onChange({ ...state, note: event.target.value })} />
    </div>
    {message && <p className={message === "Count saved." ? "status" : "error"}
      role={message === "Count saved." ? "status" : "alert"}>{t(message)}</p>}
    <div className="actions">
      <button type="submit">{t("Save count")}</button>
      <button type="button" className="secondary" onClick={clear}>{t("Clear unsaved count")}</button>
    </div>
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
      if (strict && isInvalidQuantity(value)) {
        throw new TypeError("Quantities must be non-negative integers");
      }
      return [String(denomination), Number.isSafeInteger(quantity) && quantity >= 0 ? quantity : 0];
    })),
  ]));
}

function isInvalidQuantity(value: string): boolean {
  return value !== "" && (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)));
}

export function LocalSettingsErrorPage({ message }: { message: string }) {
  return <AppShell><LocalSettingsErrorContent message={message} /></AppShell>;
}

function LocalSettingsErrorContent({ message }: { message: string }) {
  const t = useText();
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return <Page title="Local settings unavailable">
    <p ref={ref} className="error" role="alert" tabIndex={-1}>{t(message)}</p>
  </Page>;
}

function LocalizedText({ text, role }: { text: string; role?: "status" | "alert" }) {
  const t = useText();
  return <p role={role}>{t(text)}</p>;
}

function ReturnHomeLink() {
  const t = useText();
  return <a href="/">{t("Return home")}</a>;
}

function Page({ title, children, className }: {
  title: string; children: React.ReactNode; className?: string;
}) {
  const t = useText();
  return <section className={`card${className ? ` ${className}` : ""}`} aria-labelledby="page-title">
    <h1 id="page-title">{t(title)}</h1>{children}
  </section>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = readOptionalPreference("cyndy.locale");
    if (stored === "en" || stored === "es") return stored;
    return navigator.language.toLowerCase().startsWith("en") ? "en" : "es";
  });
  const [dark, setDark] = useState(() => readOptionalPreference("cyndy.theme") !== "light");
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    writeOptionalPreference("cyndy.theme", dark ? "dark" : "light");
  }, [dark]);
  useEffect(() => {
    document.documentElement.lang = locale;
    const offlineReady = document.querySelector<HTMLElement>("#offline-ready");
    if (!offlineReady) return;
    offlineReady.lang = locale;
    offlineReady.textContent = locale === "es"
      ? "El acceso sin conexión está listo. Las funciones locales y los conteos guardados están disponibles sin conexión."
      : "Offline access is ready. Local features and saved records are available without a connection.";
  }, [locale]);
  const es = locale === "es";
  const words = es ? { home: "Inicio", count: "Contar", history: "Historial", settings: "Ajustes", nav: "Navegación de CYNDY", theme: "Cambiar tema", language: "Cambiar idioma" } : { home: "Home", count: "Count", history: "History", settings: "Settings", nav: "CYNDY navigation", theme: "Change theme", language: "Change language" };
  const activePath = window.location.pathname;
  return <LocaleContext.Provider value={locale}>
    <a className="skip-link" href="#main-content" onClick={(event) => { event.preventDefault(); document.getElementById("main-content")?.focus(); }}>{es ? "Saltar al contenido principal" : "Skip to main content"}</a>
    <header className="app-header">
      <a className="header-control home-control" href="/" aria-label={words.home}>⌂</a>
      <a className="brand" href="/" aria-label={es ? "Inicio de CYNDY" : "CYNDY home"}><span aria-hidden="true">C</span> CYNDY</a>
      <div className="header-actions"><button type="button" className="header-control" aria-label={words.theme} onClick={() => setDark((value) => !value)}>{dark ? "☾" : "☀"}</button><button type="button" className="header-control" aria-label={words.language} onClick={() => { const next = es ? "en" : "es"; writeOptionalPreference("cyndy.locale", next); setLocale(next); }}>{es ? "ES" : "EN"}</button></div>
    </header>
    <main id="main-content" className="app-shell" tabIndex={-1}>{children}</main>
    <nav className="bottom-nav" aria-label={words.nav}><a href="/count/new" aria-label={words.count} aria-current={activePath === "/count/new" ? "page" : undefined} onClick={navigateLocally("/count/new")}><span aria-hidden="true">⌗</span><span>{words.count}</span></a><a href="/history" aria-label={words.history} aria-current={activePath === "/history" ? "page" : undefined} onClick={navigateLocally("/history")}><span aria-hidden="true">◷</span><span>{words.history}</span></a><a href="/settings" aria-label={words.settings} aria-current={activePath === "/settings" ? "page" : undefined} onClick={navigateLocally("/settings")}><span aria-hidden="true">⚙</span><span>{words.settings}</span></a></nav>
  </LocaleContext.Provider>;
}

function navigateLocally(path: string) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.history.pushState({}, "", path);
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.setTimeout(() => document.getElementById("main-content")?.focus(), 0);
  };
}

function replaceLocation(path: string) {
  window.history.replaceState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function formatIssue(message: string) {
  return `${message[0]?.toUpperCase()}${message.slice(1)}.`;
}
