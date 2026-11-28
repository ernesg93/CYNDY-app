import { createContext, useContext, useEffect, useRef, useState, type FormEvent, type MouseEvent } from "react";
import { version } from "../../package.json";
import { calculateCountSnapshots, type CountQuantities } from "../domain/count";
import { formatNumber } from "../domain/format-number";
import type { CurrencyConfiguration, ValidationIssue } from "../domain/validation";
import { validateCurrencyConfiguration } from "../domain/validation";
import {
  BrowserPrintDestination,
  type ReceiptDestination,
} from "../receipts/receipt-destination";
import { createDraftRevision, type CountRecord, type IndexedDbRepository } from "../storage/indexed-db-repository";

export interface ConfigurationFormValues {
  name: string;
  symbol: string;
  code: string;
  denominations: string;
}

const emptyConfiguration: ConfigurationFormValues = {
  name: "", symbol: "", code: "", denominations: "",
};

const defaultCurrencies: readonly CurrencyConfiguration[] = [
  { id: "usd", name: "Dolar US", symbol: "$", code: "USD", denominations: [1, 2, 5, 10, 20, 50, 100] },
  { id: "cup", name: "Pesos cubano", symbol: "$", code: "CUP", denominations: [1, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000] },
];

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
  "Count title": "Título del conteo",
  "Settings": "Ajustes",
  "History": "Historial",
  "Page not found": "Página no encontrada",
  "Return home": "Volver al inicio",
  "Saved counts unavailable": "Conteos guardados no disponibles",
  "Could not load saved counts. Refresh and try again.": "No se pudieron cargar los conteos guardados. Actualiza e inténtalo de nuevo.",
  "Local dashboard": "Panel local",
  "Review saved counts on this device.": "Revisa los conteos guardados en este dispositivo.",
  "Start a count": "Iniciar un conteo",
  "Choose currencies": "Elige las monedas",
  "Configure another currency": "Configurar otra moneda",
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
  "All quantities are zero.": "Todas las cantidades son cero.",
  "Saved count": "Folio guardado",
  "Loading count…": "Cargando conteo…",
  "Count deleted": "Conteo eliminado",
  "Count deleted.": "Conteo eliminado.",
  "Count not found": "Conteo no encontrado",
  "Return to history": "Volver al historial",
  "Note": "Nota",
  "No note": "Sin nota",
  "Print or save": "Imprimir o Guardar",
  "Resume as new count": "Retomar como nuevo conteo",
  "Replace unfinished count?": "¿Reemplazar el conteo pendiente?",
  "The unfinished draft will be replaced. The saved count will remain unchanged.": "El borrador pendiente será reemplazado. El conteo guardado permanecerá sin cambios.",
  "Replace draft": "Reemplazar borrador",
  "Could not resume the count. Your draft and saved count were kept. Refresh and try again.": "No se pudo retomar el conteo. Se conservaron el borrador y el conteo guardado. Actualiza e inténtalo de nuevo.",
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
  "Denominations (semicolon separated)": "Denominaciones (separadas por punto y coma)",
  "Example: 1,000; 1": "Ejemplo: 1,000; 1",
  "Add another currency": "Agregar otra moneda",
  "Move up": "Subir",
  "Move down": "Bajar",
  "Move": "Mover",
  "up": "arriba",
  "down": "abajo",
  "Save configuration": "Guardar configuración",
  "Save settings": "Guardar ajustes",
  "Local settings": "Ajustes locales",
  "Note (optional)": "Nota (opcional)",
  "Save count": "Guardar conteo",
  "Saving…": "Guardando…",
  "This count has already been saved. Save it again?": "Este conteo ya se guardó. ¿Quieres guardarlo nuevamente?",
  "Saving again creates a separate copy.": "Al guardarlo nuevamente se crea una copia independiente.",
  "Save again": "Guardar nuevamente",
  "Cancel": "Cancelar",
  "Clear unsaved count": "Limpiar conteo",
  "Loading saved counts…": "Cargando conteos guardados…",
  "View count": "Ver conteo",
  "Add currencies and their positive whole-number denominations.": "Agrega monedas y sus denominaciones enteras positivas.",
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
  "Draft saved locally.": "Borrador guardado en este dispositivo.",
  "Draft cleared locally.": "Borrador eliminado de este dispositivo.",
  "A newer draft was kept on this device.": "Se conservó un borrador más reciente en este dispositivo.",
  "Could not load the draft. Refresh and try again.": "No se pudo cargar el borrador. Actualiza e inténtalo de nuevo.",
  "Could not store the draft locally. Your changes may be lost.": "No se pudo guardar el borrador. Podrías perder los cambios.",
  "Could not discard the draft locally. It may return after reload.": "No se pudo eliminar el borrador. Podría reaparecer al actualizar.",
  "Enter a whole number from 0 to 99,999,999.": "Ingresa un número entero entre 0 y 99,999,999.",
  "Maximum 8 digits; the previous value was kept.": "Máximo 8 cifras; se conservó el valor anterior.",
  "The count total exceeds the supported range.": "El total del conteo supera el rango permitido.",
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
  "Denomination": "Denominación",
  "Quantity": "Cantidad",
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
  readonly lastSavedCount?: string;
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
      return { page: "detail", countId: decodeURIComponent(receipt[1]) };
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
      .split(";")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(value)
        ? Number(value.replace(/,/g, "")) : NaN),
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
  const updateDenominations = (input: HTMLInputElement, text: string, start: number, end: number, regroupIndex = -1) => {
    const parts = text.split(";");
    const formatted = parts.map((part, partIndex) => {
      const match = part.match(/^(\s*)([\d,]+)(\s*)$/);
      if (!match) return part;
      const digits = match[2];
      if (partIndex !== regroupIndex && !/^\d+$/.test(digits)) return part;
      return match[1] + formatNumber(digits.replace(/,/g, "")) + match[3];
    }).join(";");
    const mapPosition = (position: number) => {
      const prefix = text.slice(0, position).replace(/,/g, "");
      let offset = 0;
      let consumed = 0;
      while (offset < formatted.length && consumed < prefix.length) {
        if (formatted[offset] !== ",") consumed++;
        offset++;
      }
      return offset;
    };
    const newStart = mapPosition(start);
    const newEnd = mapPosition(end);
    input.value = formatted;
    input.setSelectionRange(newStart, newEnd);
    onChange({ ...values, denominations: formatted });
  };
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
          onKeyDown={(event) => {
            if (name !== "denominations" || event.altKey || event.ctrlKey || event.metaKey) return;
            const input = event.currentTarget;
            const caret = input.selectionStart;
            if (caret === null || caret !== input.selectionEnd) return;
            const backward = event.key === "Backspace" && input.value[caret - 1] === ",";
            const forward = event.key === "Delete" && input.value[caret] === ",";
            if (!backward && !forward) return;
            const index = backward ? caret - 2 : caret + 1;
            if (!/\d/.test(input.value[index] ?? "")) return;
            event.preventDefault();
            const text = input.value.slice(0, index) + input.value.slice(index + 1);
            const next = backward ? index : caret;
            updateDenominations(input, text, next, next, text.slice(0, next).split(";").length - 1);
          }}
          onChange={(event) => {
            if (name !== "denominations") {
              onChange({ ...values, [name]: event.target.value });
              return;
            }
            const input = event.currentTarget;
            const text = input.value;
            const start = input.selectionStart ?? text.length;
            const end = input.selectionEnd ?? start;
            const native = event.nativeEvent as InputEvent;
            const partIndex = text.slice(0, start).split(";").length - 1;
            const previous = values.denominations.split(";")[partIndex]?.trim() ?? "";
            const edited = text.split(";")[partIndex]?.trim() ?? "";
            const regroup = (native.inputType === "insertText" || native.inputType?.startsWith("deleteContent"))
              && native.data !== "," && /^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(previous)
              && /^[\d,]+$/.test(edited) ? partIndex : -1;
            updateDenominations(input, text, start, end, regroup);
          }}
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
      {field("denominations", t("Denominations (semicolon separated)"))}
      <p>{t("Example: 1,000; 1")}</p>
    </fieldset>
  );
}

const browserPrintDestination = new BrowserPrintDestination();
const draftQueues = new WeakMap<IndexedDbRepository, { current: Promise<void> }>();

function draftQueue(repository: IndexedDbRepository) {
  let queue = draftQueues.get(repository);
  if (!queue) {
    queue = { current: Promise.resolve() };
    draftQueues.set(repository, queue);
  }
  return queue;
}

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
  const pathRef = useRef(path);
  pathRef.current = path;
  const resumeLock = useRef(false);
  const [resumePending, setResumePending] = useState(false);
  const [selectedCurrencies, setSelectedCurrencies] = useState<readonly string[]>([]);
  const [countDraft, setCountDraft] = useState<CountDraftState>({
    quantities: {}, note: "", invalidQuantityKeys: new Set(),
  });
  const draftRef = useRef(countDraft);
  const historicalRef = useRef<readonly CurrencyConfiguration[] | undefined>(undefined);
  const [historicalConfigurations, setHistoricalConfigurations] = useState<readonly CurrencyConfiguration[]>();
  const hasDraft = useRef(false);
  const selectedRef = useRef(selectedCurrencies);
  const revision = useRef(0);
  const resetEpoch = useRef(0);
  const durableRevision = useRef<string | null>(null);
  const committedRevision = useRef<string | null>(null);
  const pending = draftQueue(repository);
  const [draftFeedback, setDraftFeedback] = useState<{ error: boolean; text: string }>();
  const enqueue = (operation: () => Promise<void>) => {
    const result = pending.current.then(operation);
    pending.current = result.catch(() => {});
    return result;
  };
  const persist = (draft: CountDraftState, selected: readonly string[]) => {
    hasDraft.current = true;
    const current = ++revision.current;
    const identity = createDraftRevision();
    const epoch = resetEpoch.current;
    const historical = historicalRef.current;
    durableRevision.current = identity;
    setDraftFeedback(undefined);
    void enqueue(async () => {
      if (epoch !== resetEpoch.current) return;
      await repository.saveCountDraft({ quantities: draft.quantities, note: draft.note, selectedCurrencies: selected, ...(historical ? { historicalConfigurations: historical } : {}) }, identity, committedRevision.current);
      committedRevision.current = identity;
    }).then(() => {
      if (current === revision.current) setDraftFeedback({ error: false, text: "Draft saved locally." });
    }).catch(() => {
      if (current === revision.current) setDraftFeedback({ error: true, text: "Could not store the draft locally. Your changes may be lost." });
    });
  };
  const updateDraft = (update: CountDraftState | ((current: CountDraftState) => CountDraftState)) => {
    const previous = draftRef.current;
    const next = typeof update === "function" ? update(previous) : update;
    draftRef.current = next;
    setCountDraft(next);
    if (next.quantities !== previous.quantities || next.note !== previous.note) persist(next, selectedRef.current);
  };
  const updateSelection = (selected: readonly string[]) => {
    selectedRef.current = selected;
    setSelectedCurrencies(selected);
    persist(draftRef.current, selected);
  };
  const discard = async (expected: string | null) => {
    if (expected !== durableRevision.current) return;
    const current = ++revision.current;
    const nextRevision = createDraftRevision();
    durableRevision.current = nextRevision;
    setDraftFeedback(undefined);
    try {
      let removed: string | null = null;
      await enqueue(async () => {
        removed = await repository.deleteCountDraft(committedRevision.current, nextRevision);
        if (removed) committedRevision.current = removed;
      });
      if (current === revision.current && removed) {
        durableRevision.current = removed;
        hasDraft.current = false;
        setDraftFeedback({ error: false, text: "Draft cleared locally." });
      } else if (current === revision.current) {
        setDraftFeedback({ error: true, text: "A newer draft was kept on this device." });
      }
    } catch {
      if (current === revision.current) setDraftFeedback({ error: true, text: "Could not discard the draft locally. It may return after reload." });
    }
  };
  useEffect(() => {
    let active = true;
    void repository.getCurrencyConfigurations()
      .then(async (saved) => {
        const initial = saved.length || window.location.pathname === "/onboarding" ? saved : defaultCurrencies;
        if (!saved.length && initial.length) await repository.saveCurrencyConfigurations(initial);
        let restored;
        try { await pending.current; restored = await repository.getCountDraft(); }
        catch { if (active) setLoadError("Could not load the draft. Refresh and try again."); return; }
        if (!active) return;
        const liveDraft = restored && !("cleared" in restored) ? restored : undefined;
        const selected = liveDraft?.selectedCurrencies ?? initial.map((currency) => currency.id);
        const draft: CountDraftState = { quantities: liveDraft?.quantities ?? {}, note: liveDraft?.note ?? "", invalidQuantityKeys: new Set() };
        draftRef.current = draft;
        historicalRef.current = liveDraft?.historicalConfigurations;
        setHistoricalConfigurations(liveDraft?.historicalConfigurations);
        hasDraft.current = !!liveDraft;
        durableRevision.current = restored?.revision ?? null;
        committedRevision.current = durableRevision.current;
        selectedRef.current = selected;
        setCountDraft(draft);
        setSelectedCurrencies(selected);
        setConfigurations(initial);
      })
      .catch(() => { if (active) setLoadError("Could not load local settings. Refresh and try again."); });
    return () => { active = false; };
  }, [repository]);
  useEffect(() => {
    const syncPath = () => {
      if (resumeLock.current) { window.history.replaceState({}, "", pathRef.current); return; }
      setPath(`${window.location.pathname}${window.location.search}`);
    };
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
        const selected = result.configurations.map((currency) => currency.id);
        selectedRef.current = selected;
        setSelectedCurrencies(selected);
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
  const prepareResume = async () => {
    const localRevision = revision.current;
    await pending.current;
    const stored = await repository.getCountDraft();
    if (localRevision !== revision.current) throw new Error("Draft changed");
    return { expected: stored?.revision ?? null, localRevision, needsConfirmation: hasDraft.current || !!(stored && !("cleared" in stored)) };
  };
  const resume = async (record: CountRecord, prepared: Awaited<ReturnType<typeof prepareResume>>) => {
    const historical = record.snapshots.map((snapshot) => ({ id: snapshot.currencyId, name: snapshot.name, symbol: snapshot.symbol, code: snapshot.code, denominations: snapshot.entries.map((entry) => entry.denomination) }));
    if (!historical.length || historical.some((item) => validateCurrencyConfiguration(item).length) || findDuplicateCurrencyIndexes(historical).size) throw new Error("Unsupported historical configuration");
    const quantities = Object.fromEntries(record.snapshots.flatMap((snapshot) => snapshot.entries.map((entry) => [`${snapshot.currencyId}:${entry.denomination}`, String(entry.quantity)])));
    const selected = historical.map((item) => item.id);
    const draft: CountDraftState = { quantities, note: record.title ?? "", invalidQuantityKeys: new Set() };
    const identity = createDraftRevision();
    if (resumeLock.current) throw new Error("Resume in progress");
    resumeLock.current = true;
    setResumePending(true);
    try {
      await enqueue(async () => {
        if (revision.current !== prepared.localRevision) throw new Error("Draft changed");
        await repository.saveCountDraft({ quantities, note: draft.note, selectedCurrencies: selected, historicalConfigurations: historical }, identity, prepared.expected);
        committedRevision.current = identity;
      });
      if (revision.current !== prepared.localRevision) throw new Error("Draft changed while resuming");
      ++revision.current;
      durableRevision.current = identity;
      hasDraft.current = true;
      historicalRef.current = historical;
      setHistoricalConfigurations(historical);
      draftRef.current = draft;
      setCountDraft(draft);
      selectedRef.current = selected;
      setSelectedCurrencies(selected);
      setDraftFeedback(undefined);
      resumeLock.current = false;
      replaceLocation("/count/new");
      setPath("/count/new");
    } finally {
      resumeLock.current = false;
      setResumePending(false);
    }
  };
  if (route.page === "dashboard") return <AppShell><Dashboard repository={repository} configurations={configurations} selected={selectedCurrencies} onSelectionChange={updateSelection} feedback={draftFeedback} reset={() => enqueue(async () => {
    await repository.resetAll(defaultCurrencies);
    ++resetEpoch.current;
    ++revision.current;
    durableRevision.current = (await repository.getCountDraft())?.revision ?? null;
    committedRevision.current = durableRevision.current;
  })} onReset={() => {
    ++revision.current;
    replaceLocation("/");
    const selected = defaultCurrencies.map((currency) => currency.id);
    selectedRef.current = selected;
    setSelectedCurrencies(selected);
    const empty = { quantities: {}, note: "", invalidQuantityKeys: new Set<string>() };
    draftRef.current = empty;
    setCountDraft(empty);
    setDraftFeedback(undefined);
    hasDraft.current = false;
    historicalRef.current = undefined;
    setHistoricalConfigurations(undefined);
    setNotice("All local data was reset.");
    setValues([emptyConfiguration]);
    setIssues([[]]);
    setSaveError(undefined);
    setConfigurations(defaultCurrencies);
  }} /></AppShell>;
  if (route.page === "count") return <AppShell><CountPage configurations={historicalConfigurations ?? configurations}
    repository={repository} state={countDraft} onChange={updateDraft} selected={selectedCurrencies} onSelectionChange={updateSelection}
    feedback={draftFeedback} getRevision={() => revision.current} getDraftRevision={() => durableRevision.current} onDiscard={discard} onClear={() => {
      const empty = { quantities: {}, note: "", invalidQuantityKeys: new Set<string>() };
      draftRef.current = empty;
      setCountDraft(empty);
      historicalRef.current = undefined;
      setHistoricalConfigurations(undefined);
      void discard(durableRevision.current);
    }} /></AppShell>;
  if (route.page === "settings") return <AppShell><SettingsPage configurations={configurations}
    repository={repository} onSaved={(updated) => {
      setConfigurations(updated);
      if (!historicalRef.current) {
        const selected = [...selectedRef.current.filter((id) => updated.some((currency) => currency.id === id)), ...updated.filter((currency) => !configurations.some((previous) => previous.id === currency.id)).map((currency) => currency.id)];
        updateSelection(selected);
      }
    }} /></AppShell>;
  if (route.page === "history") return <AppShell><HistoryPage repository={repository} /></AppShell>;
  if (route.page === "detail") return <><div inert={resumePending || undefined}><AppShell><CountDetailPage countId={route.countId!} repository={repository} destination={receiptDestination} prepareResume={prepareResume} resume={resume} /></AppShell></div>{resumePending && <LocalizedText role="status" text="Saving…" />}</>;
  return <AppShell><Page title="Page not found"><ReturnHomeLink /></Page></AppShell>;
}

function Dashboard({ repository, onReset, reset, configurations, selected, onSelectionChange, feedback }: {
  repository: IndexedDbRepository; onReset: () => void; reset: () => Promise<void>;
  feedback?: { error: boolean; text: string };
  configurations: readonly CurrencyConfiguration[]; selected: readonly string[]; onSelectionChange: (ids: readonly string[]) => void;
}) {
  const t = useText();
  const [data, setData] = useState<{
    latest?: CountRecord; counts: readonly CountRecord[];
  }>();
  const [error, setError] = useState(false);
  const [resetStage, setResetStage] = useState<0 | 1 | 2>(0);
  const [resetError, setResetError] = useState<string>();
  const [resetNotice, setResetNotice] = useState(false);
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
    {feedback && <p className={feedback.error ? "error" : "status"} role={feedback.error ? "alert" : undefined}>{t(feedback.text)}</p>}
    <CurrencySelector configurations={configurations} selected={selected} onChange={onSelectionChange} />
    <a className="button dashboard-start" href="/count/new" onClick={(event) => { if (selected.length === 0) event.preventDefault(); else navigateLocally("/count/new")(event); }} aria-disabled={selected.length === 0} >{t("Start a count")}</a>
    <a href="/settings" onClick={navigateLocally("/settings")}>{t("Configure another currency")}</a>
    <section className="dashboard-section" aria-labelledby="latest-count-title"><h2 id="latest-count-title">{t("Latest count")}</h2>
    {data.latest ? <article className="dashboard-card">
      <CountTime record={data.latest} />
      <strong>{data.latest.title || t("New count")}</strong>
      <SnapshotSubtotals record={data.latest} />
      <a href={`/history/${encodeURIComponent(data.latest.id)}`}>{t("View latest count")}</a>
    </article> : <p>{t("No saved counts yet.")}</p>}</section>
    <section className="dashboard-section" aria-labelledby="local-statistics-title"><h2 id="local-statistics-title">{t("Local statistics")}</h2>
    <article className="dashboard-card"><p>{formatNumber(data.counts.length)} {t("saved")} {t(data.counts.length === 1 ? "count" : "counts")}</p>
    <ul>{[...statistics].map(([code, count]) =>
      <li key={code}>{code}: {formatNumber(count)} {t(count === 1 ? "count" : "counts")}</li>)}</ul></article></section>
    <section className="dashboard-section dashboard-data" aria-labelledby="local-data-title"><h2 id="local-data-title">{t("Local data")}</h2>
    {resetNotice && <p className="status" role="status">{t("All local data was reset.")}</p>}
    {resetError && <p ref={resetErrorRef} className="error" role="alert" tabIndex={-1}>
      {t(resetError)}
    </p>}
    {resetStage === 0 ? <button ref={resetButtonRef} className="dashboard-reset-button" type="button" onClick={() => {
      setResetNotice(false); setResetError(undefined); setResetStage(1);
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
      onConfirm={() => resetStage === 1 ? setResetStage(2) : void reset()
        .then(() => { setData({ counts: [] }); setResetStage(0); setResetNotice(true); onReset(); })
        .catch(() => {
          setResetStage(0);
          setResetError("Could not reset local data. Try again.");
        })}
    />}</section>
  </Page>;
}

function HistoryPage({ repository }: { repository: IndexedDbRepository }) {
  const t = useText();
  const locale = useContext(LocaleContext);
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
          <h3>{count.title || t("New count")}</h3>
          <CountTime record={count} className="history-record-date" />
          <SnapshotSubtotals record={count} className="history-subtotals" />
          <a className="history-record-link" href={`/history/${encodeURIComponent(count.id)}`}
            aria-label={`${t("View count")}: ${count.title || t("New count")}, ${formatCountTime(count.createdAt, locale)}`}>{t("View count")}<span aria-hidden="true">→</span></a>
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

function CountDetailPage({ countId, repository, destination, prepareResume, resume }: {
  countId: string; repository: IndexedDbRepository; destination: ReceiptDestination;
  prepareResume: () => Promise<{ expected: string | null; localRevision: number; needsConfirmation: boolean }>;
  resume: (record: CountRecord, prepared: { expected: string | null; localRevision: number; needsConfirmation: boolean }) => Promise<void>;
}) {
  const t = useText();
  const [record, setRecord] = useState<CountRecord | null>();
  const [error, setError] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [prepared, setPrepared] = useState<Awaited<ReturnType<typeof prepareResume>>>();
  const [resumeError, setResumeError] = useState(false);
  const [, setResuming] = useState(false);
  const resumeBusy = useRef(false);
  const detailGeneration = useRef(0);
  useEffect(() => {
    ++detailGeneration.current;
    resumeBusy.current = false;
    return () => { ++detailGeneration.current; };
  }, [countId]);
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
  const visibleSnapshots = record.snapshots.map((snapshot) => ({
    ...snapshot, entries: snapshot.entries.filter((entry) => entry.quantity !== 0),
  })).filter((snapshot) => snapshot.entries.length > 0);
  return <Page title="Count details" className="detail-page">
    <h2>{record.title || t("New count")}</h2>
    <CountTime record={record} />
    <div className="detail-sheet">{visibleSnapshots.length === 0 ? <p>{t("All quantities are zero.")}</p> : visibleSnapshots.map((snapshot) => <section key={snapshot.currencyId}>
      <h2>{snapshot.name} ({snapshot.code})</h2>
      <table className="detail-table" aria-label={`${snapshot.name} (${snapshot.code})`}>
        <thead><tr><th scope="col">{t("Denomination")}</th><th scope="col">{t("Quantity")}</th><th scope="col">{t("Subtotal")}</th></tr></thead>
        <tbody>{snapshot.entries.map((entry) => <tr key={entry.denomination}><td>{snapshot.symbol}{formatNumber(entry.denomination)}</td><td>{formatNumber(entry.quantity)}</td><td>{snapshot.symbol}{formatNumber(entry.total)}</td></tr>)}</tbody>
      </table>
      <p>{t("Total")}: {snapshot.symbol}{formatNumber(snapshot.subtotal)} {snapshot.code}</p>
    </section>)}</div>
    <div className="detail-actions"><button type="button" onClick={() => destination.deliver(record)}>{t("Print or save")}</button>
    <button type="button" onClick={() => {
      if (resumeBusy.current) return;
      resumeBusy.current = true; setResuming(true); setResumeError(false);
      const origin = `${window.location.pathname}${window.location.search}`;
      const generation = detailGeneration.current;
      const isCurrent = () => detailGeneration.current === generation && `${window.location.pathname}${window.location.search}` === origin;
      void prepareResume().then(async (result) => {
        if (!isCurrent()) return;
        if (result.needsConfirmation) setPrepared(result);
        else await resume(record, result);
      }).catch(() => { if (isCurrent()) setResumeError(true); }).finally(() => {
        if (isCurrent()) { resumeBusy.current = false; setResuming(false); }
      });
    }}>{t("Resume as new count")}</button>
    {resumeError && <p role="alert" className="error">{t("Could not resume the count. Your draft and saved count were kept. Refresh and try again.")}</p>}
    {prepared && <ConfirmationPanel title="Replace unfinished count?" description="The unfinished draft will be replaced. The saved count will remain unchanged." cancelLabel="Cancel" confirmLabel="Replace draft" onCancel={() => setPrepared(undefined)} onConfirm={() => {
      if (resumeBusy.current) return;
      resumeBusy.current = true; setResuming(true);
      void resume(record, prepared).catch(() => setResumeError(true)).finally(() => { resumeBusy.current = false; setResuming(false); setPrepared(undefined); });
    }} />}
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
    </div>
  </Page>;
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

function formatCountTime(timestamp: string, locale: Locale): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp
    : new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(date);
}

function CountTime({ record, className }: { record: CountRecord; className?: string }) {
  const locale = useContext(LocaleContext);
  return <time className={className} dateTime={record.createdAt}>{formatCountTime(record.createdAt, locale)}</time>;
}

function SnapshotSubtotals({ record, className }: { record: CountRecord; className?: string }) {
  return <ul className={className}>{record.snapshots.map((snapshot) => <li key={snapshot.currencyId}>
    {snapshot.symbol}{formatNumber(snapshot.subtotal)} {snapshot.code}
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
    <p>{t("Add currencies and their positive whole-number denominations.")}</p>
    <form onSubmit={(event: FormEvent) => { event.preventDefault(); props.onSubmit(); }} noValidate>
      {props.values.map((values, index) => <ConfigurationForm key={index}
        values={values} issues={props.issues[index] ?? []} index={index}
        onChange={(draft) => props.onChange(index, draft)} />)}
      {<button type="button" onClick={props.onAdd}>{t("Add another currency")}</button>}
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
      denominations: configuration.denominations.map(formatNumber).join("; "),
    })) : [emptyConfiguration]);
  const [issues, setIssues] = useState<readonly (readonly ValidationIssue[])[]>([[]]);
  const [keys, setKeys] = useState(() => configurations.length ? configurations.map((_, index) => index) : [0]);
  const nextKey = useRef(keys.length);
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

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= values.length) return;
    const swap = <T,>(items: readonly T[]): T[] => {
      const copy = [...items];
      [copy[index], copy[target]] = [copy[target], copy[index]];
      return copy;
    };
    setValues(swap(values));
    setKeys(swap(keys));
    setIssues(swap(values.map((_, itemIndex) => issues[itemIndex] ?? [])));
    setMessage(undefined);
  };

  return <Page title="Settings" className="settings-page">
    <p className="eyebrow">{t("Local settings")}</p>
    <p className="settings-intro">{t("Edit the currencies and positive whole-number denominations used by future counts.")}</p>
    {error && <p ref={messageRef} className="error" role="alert" tabIndex={-1}>{t(error)}</p>}
    {message && !error && <p ref={messageRef} className="status" role="status" tabIndex={-1}>{t(message)}</p>}
    <form ref={formRef} onSubmit={(event: FormEvent) => { event.preventDefault(); void save(); }} noValidate>
      {values.map((item, index) => <div key={keys[index]} className="settings-currency">
        <ConfigurationForm values={item} issues={issues[index] ?? []} index={index}
          onChange={(draft) => {
            setValues(values.map((value, itemIndex) => itemIndex === index ? draft : value));
            setMessage(undefined);
          }} />
        <div className="currency-order-actions">
          <button type="button" disabled={index === 0} aria-label={`${t("Move")} ${item.code || `${t("Currency")} ${index + 1}`} ${t("up")}`} onClick={() => move(index, -1)}>{t("Move up")}</button>
          <button type="button" disabled={index === values.length - 1} aria-label={`${t("Move")} ${item.code || `${t("Currency")} ${index + 1}`} ${t("down")}`} onClick={() => move(index, 1)}>{t("Move down")}</button>
        </div>
      </div>)}
      <div className="settings-actions">
        {<button type="button"
          onClick={() => {
            setValues([{ ...emptyConfiguration }, ...values]);
            setKeys([nextKey.current++, ...keys]);
            setIssues([[], ...values.map((_, index) => issues[index] ?? [])]);
            setMessage(undefined);
          }}>{t("Add another currency")}</button>}
        <button type="submit">{t("Save settings")}</button>
      </div>
      <p className="settings-repair-note">{t("Changes apply to future counts. Saved counts keep their original values.")}</p>
    </form>
  </Page>;
}

function CurrencySelector({ configurations, selected, onChange }: {
  configurations: readonly CurrencyConfiguration[]; selected: readonly string[];
  onChange: (ids: readonly string[]) => void;
}) {
  const t = useText();
  return <fieldset className="currency-selector"><legend>{t("Choose currencies")}</legend>
    {configurations.map((currency) => <label key={currency.id}>
      <input type="checkbox" checked={selected.includes(currency.id)} onChange={(event) => onChange(
        event.target.checked ? [...selected, currency.id] : selected.filter((id) => id !== currency.id)
      )} /> {currency.code}
    </label>)}
  </fieldset>;
}

function CountPage({ configurations: allConfigurations, repository, state, onChange, selected, onSelectionChange, feedback, getRevision, getDraftRevision, onDiscard, onClear }: {
  configurations: readonly CurrencyConfiguration[]; selected: readonly string[]; onSelectionChange: (ids: readonly string[]) => void;
  feedback?: { error: boolean; text: string }; getRevision: () => number; getDraftRevision: () => string | null; onDiscard: (revision: string | null) => Promise<void>; onClear: () => void;
  repository: Pick<IndexedDbRepository, "saveCount">;
  state: CountDraftState;
  onChange: (update: CountDraftState | ((state: CountDraftState) => CountDraftState)) => void;
}) {
  const t = useText();
  const configurations = allConfigurations.filter((currency) => selected.includes(currency.id));
  const { quantities: draft, note, message, invalidQuantityKeys } = state;
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [confirmation, setConfirmation] = useState<string>();
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const [limitWarning, setLimitWarning] = useState<string>();
  const selectionRef = useRef<{ input: HTMLInputElement; start: number; end: number; value: string } | null>(null);
  const quantities = toQuantities(configurations, draft, false);
  let rangeExceeded = false;
  let snapshots;
  try {
    snapshots = configurations.length ? calculateCountSnapshots(configurations, quantities) : [];
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    rangeExceeded = true;
    snapshots = calculateCountSnapshots(configurations, {});
  }

  const clear = () => {
    setConfirmation(undefined);
    setLimitWarning(undefined);
    onClear();
  };

  const save = async (confirmDuplicate = false) => {
    if (savingRef.current || configurations.length === 0) return;
    const invalidKeys = new Set(configurations.flatMap((configuration) =>
      configuration.denominations.map((denomination) => `${configuration.id}:${denomination}`)
        .filter((key) => isInvalidQuantity(draft[key] ?? ""))));
    if (invalidKeys.size > 0) {
      onChange({ ...state, invalidQuantityKeys: invalidKeys,
        message: "Quantities must be non-negative integers." });
      return;
    }
    if (rangeExceeded) {
      onChange({ ...state, invalidQuantityKeys: invalidKeys, message: "The count total exceeds the supported range." });
      return;
    }
    onChange({ ...state, invalidQuantityKeys: invalidKeys });
    try {
      const checked = toQuantities(configurations, draft, true);
      const payload = {
        snapshots: calculateCountSnapshots(configurations, checked),
        ...(note.trim() ? { title: note.trim() } : {}),
      };
      const fingerprint = JSON.stringify(payload);
      if (!confirmDuplicate && fingerprint === state.lastSavedCount) {
        setConfirmation(fingerprint);
        return;
      }
      if (confirmDuplicate && confirmation !== fingerprint) return;
      setConfirmation(undefined);
      savingRef.current = true;
      setSaving(true);
      const savingRevision = getRevision();
      const savedDraftRevision = getDraftRevision();
      await repository.saveCount(payload);
      if (savingRevision === getRevision()) await onDiscard(savedDraftRevision);
      onChange((current) => ({ ...current, invalidQuantityKeys: invalidKeys,
        lastSavedCount: fingerprint, message: "Count saved." }));
    } catch {
      onChange((current) => ({ ...current, invalidQuantityKeys: invalidKeys,
        message: "Could not save the count. Try again." }));
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return <Page title="New count" className="count-page" heading={<input className="count-title-input"
    aria-label={t("Count title")} placeholder={t("New count")} value={note}
    onChange={(event) => { setConfirmation(undefined); onChange({ ...state, note: event.target.value }); }} />}><form onSubmit={(event) => { event.preventDefault(); void save(); }} noValidate>
    <CurrencySelector configurations={allConfigurations} selected={selected} onChange={onSelectionChange} />
    {configurations.map((configuration, currencyIndex) =>
      <fieldset className="currency-fieldset" key={configuration.id}>
      <legend>{configuration.name} ({configuration.code})</legend>
      <p className="currency-total"><strong>
        {rangeExceeded ? "—" : `${configuration.symbol} ${formatNumber(snapshots[currencyIndex].subtotal)} ${configuration.code}`}
      </strong></p>
      {[...snapshots[currencyIndex].entries].sort((a, b) => b.denomination - a.denomination).map((entry) => {
        const key = `${configuration.id}:${entry.denomination}`;
        const subtotalId = `${key}-subtotal`;
        const subtotalDescriptionId = `${subtotalId}-description`;
        const errorId = `${key}-error`;
        const invalid = invalidQuantityKeys.has(key);
        const updateQuantity = (input: HTMLInputElement, value: string, beforeCaret: number) => {
          if (/^\d{9,}$/.test(value)) {
            input.value = formatNumber(draft[key] ?? "");
            setLimitWarning(key);
            return;
          }
          const formatted = formatNumber(value);
          let position = 0;
          let characters = 0;
          while (position < formatted.length && characters < beforeCaret) {
            if (formatted[position] !== ",") characters++;
            position++;
          }
          input.value = formatted;
          input.setSelectionRange(position, position);
          selectionRef.current = null;
          setLimitWarning(undefined);
          setConfirmation(undefined);
          onChange({ ...state, quantities: { ...draft, [key]: value },
            invalidQuantityKeys: invalid && !isInvalidQuantity(value)
              ? new Set([...invalidQuantityKeys].filter((item) => item !== key))
              : invalidQuantityKeys });
        };
        return <div className="denomination-row" key={key}>
          <label className="denomination-value" htmlFor={key}>{formatNumber(entry.denomination)}</label>
          <span className="row-operator" aria-hidden="true">×</span>
          <input id={key} type="text" inputMode="numeric"
            aria-label={`${configuration.symbol}${formatNumber(entry.denomination)} ${t("quantity")}`}
            aria-invalid={invalid ? true : undefined}
            aria-describedby={`${subtotalDescriptionId}${invalid ? ` ${errorId}` : ""}`}
            value={formatNumber(draft[key] ?? "0")}
            onBlur={(event) => { selectionRef.current = null; if (event.currentTarget.value === "") onChange((current) => ({ ...current, quantities: { ...current.quantities, [key]: "0" } })); }}
            onSelect={(event) => {
              const input = event.currentTarget;
              selectionRef.current = { input, start: input.selectionStart ?? 0, end: input.selectionEnd ?? 0, value: input.value };
            }}
            onPaste={(event) => {
              const text = event.clipboardData.getData("text");
              if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)$/.test(text)) event.preventDefault();
            }}
            onKeyDown={(event) => {
              const input = event.currentTarget;
              const caret = input.selectionStart;
              if (caret === null || caret !== input.selectionEnd || event.altKey || event.ctrlKey || event.metaKey) return;
              const backward = event.key === "Backspace" && input.value[caret - 1] === ",";
              const forward = event.key === "Delete" && input.value[caret] === ",";
              if (!backward && !forward) return;
              event.preventDefault();
              const raw = input.value.replace(/,/g, "");
              const before = input.value.slice(0, caret).replace(/,/g, "").length;
              const index = backward ? before - 1 : before;
              updateQuantity(input, raw.slice(0, index) + raw.slice(index + 1), backward ? index : before);
            }}
            onChange={(event) => {
              const input = event.currentTarget;
              const displayed = input.value;
              if (/[^\d,]/.test(displayed)) {
                input.value = formatNumber(draft[key] ?? "0");
                const selection = selectionRef.current;
                if (selection?.input === input && selection.value === input.value) {
                  input.setSelectionRange(selection.start, selection.end);
                }
                return;
              }
              const caret = input.selectionStart ?? displayed.length;
              let value = displayed.replace(/,/g, "");
              let before = displayed.slice(0, caret).replace(/,/g, "").length;
              const inputType = (event.nativeEvent as InputEvent).inputType;
              const previous = draft[key] ?? "0";
              const selection = selectionRef.current;
              const deletedSelection = selection?.input === input && selection.value === formatNumber(previous)
                && selection.start !== selection.end;
              if (previous === "0" && !deletedSelection && !inputType?.startsWith("delete") && value.length > 1) {
                if (before === value.length && value.startsWith("0")) {
                  value = value.slice(1);
                  before--;
                } else if (before === value.length - 1 && value.endsWith("0")) {
                  value = value.slice(0, -1);
                }
                if (/^0+$/.test(value)) {
                  value = "0";
                  before = 1;
                }
              }
              if (!deletedSelection && value === previous && displayed !== formatNumber(previous)
                && (inputType === "deleteContentBackward" || inputType === "deleteContentForward")) {
                const index = inputType === "deleteContentBackward" ? before - 1 : before;
                if (index >= 0 && index < value.length) {
                  value = value.slice(0, index) + value.slice(index + 1);
                  if (inputType === "deleteContentBackward") before--;
                }
              }
              updateQuantity(input, value, before);
            }} />
          <span className="row-operator" aria-hidden="true">=</span>
          <span id={subtotalId} className={`denomination-subtotal${String(entry.total).length > 8 ? " denomination-subtotal--long" : ""}`}>{rangeExceeded ? "—" : formatNumber(entry.total)}</span>
          <span id={subtotalDescriptionId} className="visually-hidden">
            {t("Subtotal")}: {configuration.symbol}{formatNumber(entry.total)} {configuration.code}
          </span>
          {limitWarning === key && <span className="error" role="status">{t("Maximum 8 digits; the previous value was kept.")}</span>}
          {invalid && <span id={errorId} className="error">
            {t(Number(draft[key]) > 99999999
              ? "Enter a whole number from 0 to 99,999,999."
              : "Enter a non-negative whole number within the safe integer range.")}
          </span>}
        </div>;
      })}
    </fieldset>)}
    {feedback && <p className={feedback.error ? "error" : "status"} role={feedback.error ? "alert" : undefined}>{t(feedback.text)}</p>}
    {rangeExceeded && <p className="error" role="alert">{t("The count total exceeds the supported range.")}</p>}
    {message && <p className={message === "Count saved." ? "status" : "error"}
      role={message === "Count saved." ? "status" : "alert"}>{t(message)}</p>}
    <div className="actions">
      <button ref={saveButtonRef} type="submit" disabled={saving || configurations.length === 0}>{t(saving ? "Saving…" : "Save count")}</button>
      <button type="button" className="secondary" onClick={clear}>{t("Clear unsaved count")}</button>
    </div>
    {confirmation && <ConfirmationPanel
      title="This count has already been saved. Save it again?"
      description="Saving again creates a separate copy."
      cancelLabel="Cancel" confirmLabel="Save again"
      onCancel={() => { setConfirmation(undefined); setTimeout(() => saveButtonRef.current?.focus()); }}
      onConfirm={() => void save(true)} />}
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
      return [String(denomination), !isInvalidQuantity(value) && Number.isSafeInteger(quantity) && quantity >= 0 ? quantity : 0];
    })),
  ]));
}

function isInvalidQuantity(value: string): boolean {
  return value !== "" && (!/^\d{1,8}$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > 99999999);
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

function Page({ title, children, className, heading }: {
  title: string; children: React.ReactNode; className?: string; heading?: React.ReactNode;
}) {
  const t = useText();
  return <section className={`card${className ? ` ${className}` : ""}`} aria-labelledby="page-title">
    <h1 id="page-title" className={heading ? "visually-hidden" : undefined}>{t(title)}</h1>{heading}{children}
  </section>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const stored = readOptionalPreference("cyndy.locale");
    if (stored === "en" || stored === "es") return stored;
    return navigator.language.toLowerCase().startsWith("en") ? "en" : "es";
  });
  const [dark, setDark] = useState(() => readOptionalPreference("cyndy.theme") !== "light");
  const headerRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const notice = document.querySelector<HTMLElement>("#offline-ready");
    if (!notice || !headerRef.current) return;
    headerRef.current.insertAdjacentElement("afterend", notice);
    const update = () => { notice.dataset.home = String(window.location.pathname === "/"); };
    update();
    window.addEventListener("popstate", update);
    return () => { window.removeEventListener("popstate", update); document.body.prepend(notice); };
  }, []);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => document.documentElement.style.setProperty("--visual-offset", `${viewport.offsetTop}px`);
    update(); viewport.addEventListener("scroll", update); viewport.addEventListener("resize", update);
    return () => { viewport.removeEventListener("scroll", update); viewport.removeEventListener("resize", update); document.documentElement.style.removeProperty("--visual-offset"); };
  }, []);
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
    <header className="app-header" ref={headerRef}>
      <a className="header-control home-control" href="/" aria-label={words.home}><svg aria-hidden="true" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 11 12 3l9 8M5 10v10h14V10M9 20v-6h6v6" /></svg></a>
      <a className="brand" href="/" aria-label={es ? "Inicio de CYNDY" : "CYNDY home"} aria-describedby="app-version"><span aria-hidden="true">C</span> CYNDY <small id="app-version">v{version}</small></a>
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
    window.scrollTo(0, 0);
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.setTimeout(() => document.getElementById("main-content")?.focus({ preventScroll: true }), 0);
  };
}

function replaceLocation(path: string) {
  window.history.replaceState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function formatIssue(message: string) {
  return `${message[0]?.toUpperCase()}${message.slice(1)}.`;
}
