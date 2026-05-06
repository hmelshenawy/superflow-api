import { AsyncLocalStorage } from 'async_hooks';

export interface WorkshopContext {
  workshopId: string | null;
  isPlatformAdmin: boolean;
}

const workshopContext = new AsyncLocalStorage<WorkshopContext>();

export function getWorkshopContext(): WorkshopContext {
  return workshopContext.getStore() ?? { workshopId: null, isPlatformAdmin: false };
}

export function setWorkshopContext(ctx: WorkshopContext, fn: () => void): void {
  workshopContext.run(ctx, fn);
}

export function runWithWorkshop<T>(ctx: WorkshopContext, fn: () => T): T {
  return workshopContext.run(ctx, fn);
}

export { workshopContext };