import type { HealthProvider, HealthSnapshot } from "./domain";

export class GoogleHealthProvider implements HealthProvider {
  async getToday(): Promise<HealthSnapshot> {
    const response = await fetch("/api/health/today");
    if (!response.ok) throw new Error(`health-api-${response.status}`);
    return await response.json() as HealthSnapshot;
  }
}
