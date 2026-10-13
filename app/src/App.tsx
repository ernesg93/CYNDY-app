import { useState } from "react";
import { ApplicationRoutes, LocalSettingsErrorPage } from "./routes/app-routes";
import { IndexedDbRepository } from "./storage/indexed-db-repository";

interface AppProps {
  createRepository?: () => IndexedDbRepository;
}

export function App({ createRepository = () => new IndexedDbRepository() }: AppProps) {
  const [repository] = useState(() => {
    try {
      return createRepository();
    } catch {
      return null;
    }
  });

  if (!repository) {
    return <LocalSettingsErrorPage message="Could not load local settings. Refresh and try again." />;
  }
  return <ApplicationRoutes repository={repository} />;
}
