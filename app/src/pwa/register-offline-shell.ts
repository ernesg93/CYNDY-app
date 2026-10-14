export interface ServiceWorkerContainerLike {
  register(scriptURL: string | URL, options?: RegistrationOptions): PromiseLike<unknown>;
  readonly ready: PromiseLike<unknown>;
}

export async function registerOfflineShell(
  serviceWorker: ServiceWorkerContainerLike | undefined,
  announceReady: () => void,
): Promise<void> {
  if (!serviceWorker) return;

  try {
    await serviceWorker.register("/service-worker.js", { scope: "/" });
    await serviceWorker.ready;
    announceReady();
  } catch {
    // The online app remains usable; do not promise offline access after a failed install.
  }
}
