import type { Vendor } from "@servvo/canonical";
import type { RestaurantConnector } from "./connector.js";

/** Vendor → connector. Adapters register here; nothing else knows vendor names. */
export class ConnectorRegistry {
  private readonly map = new Map<Vendor, RestaurantConnector>();

  register(connector: RestaurantConnector): this {
    this.map.set(connector.vendor, connector);
    return this;
  }

  get(vendor: Vendor): RestaurantConnector {
    const c = this.map.get(vendor);
    if (!c) throw new Error(`No connector registered for vendor ${vendor}`);
    return c;
  }

  has(vendor: Vendor): boolean {
    return this.map.has(vendor);
  }

  vendors(): Vendor[] {
    return [...this.map.keys()];
  }
}

export const registry = new ConnectorRegistry();
