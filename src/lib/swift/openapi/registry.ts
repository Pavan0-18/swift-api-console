import rawSpec from "@/config/swift-messaging-2.1.1.json";
import { OpenApiParser, RawOpenApiSpec } from "./parser";
import { ApiCategoryGroup, NormalizedEndpoint } from "./types";

// Singleton parser and cache
const parser = new OpenApiParser(rawSpec as unknown as RawOpenApiSpec);
const allEndpoints: NormalizedEndpoint[] = parser.parseEndpoints();

export function getAllEndpoints(): NormalizedEndpoint[] {
  return allEndpoints;
}

export function getEndpointById(id: string): NormalizedEndpoint | undefined {
  return allEndpoints.find(
    (ep) => ep.id.toLowerCase() === id.toLowerCase() || ep.operationId.toLowerCase() === id.toLowerCase()
  );
}

export function getEndpointsByCategory(category: string): NormalizedEndpoint[] {
  return allEndpoints.filter((ep) => ep.category.toLowerCase() === category.toLowerCase());
}

export function searchEndpoints(query: string): NormalizedEndpoint[] {
  const q = query.trim().toLowerCase();
  if (!q) return allEndpoints;
  return allEndpoints.filter(
    (ep) =>
      ep.path.toLowerCase().includes(q) ||
      ep.summary.toLowerCase().includes(q) ||
      ep.description.toLowerCase().includes(q) ||
      ep.operationId.toLowerCase().includes(q) ||
      (ep.subCategory && ep.subCategory.toLowerCase().includes(q))
  );
}

export function getCategoryGroups(): ApiCategoryGroup[] {
  const categories: Array<{ id: "distributions" | "fin" | "interact" | "fileact"; name: string; description: string }> = [
    {
      id: "distributions",
      name: "Distributions",
      description: "Retrieve available distributions, manage ACKs/NAKs, and query batch delivery state.",
    },
    {
      id: "fin",
      name: "FIN",
      description: "ISO 15022 / MT message operations, transmission reports, delivery notifications, and archives.",
    },
    {
      id: "interact",
      name: "InterAct",
      description: "ISO 20022 / MX and XML interactive messaging, query reports, and archival retrieval.",
    },
    {
      id: "fileact",
      name: "FileAct",
      description: "Bulk file transfers, payload streaming, transfer acknowledgements, and export reports.",
    },
  ];

  return categories.map((cat) => {
    const endpoints = getEndpointsByCategory(cat.id);
    const subCatMap = new Map<string, NormalizedEndpoint[]>();

    endpoints.forEach((ep) => {
      const sub = ep.subCategory || "General";
      if (!subCatMap.has(sub)) {
        subCatMap.set(sub, []);
      }
      subCatMap.get(sub)!.push(ep);
    });

    const subCategories = Array.from(subCatMap.entries()).map(([subName, eps]) => ({
      id: subName.toLowerCase().replace(/\s+/g, "-"),
      name: subName,
      endpoints: eps,
    }));

    return {
      id: cat.id,
      name: cat.name,
      description: cat.description,
      subCategories,
      endpoints,
    };
  });
}
