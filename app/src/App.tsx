import { ApplicationRoutes } from "./routes/app-routes";
import { IndexedDbRepository } from "./storage/indexed-db-repository";

const repository = new IndexedDbRepository();

export function App() {
  return <ApplicationRoutes repository={repository} />;
}
