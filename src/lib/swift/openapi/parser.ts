import {
  NormalizedEndpoint,
  OpenApiParameter,
  OpenApiRequestBody,
  OpenApiResponse,
  OpenApiSchema,
  HttpMethod,
} from "./types";

export interface RawOpenApiSpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
  };
  paths: Record<string, Record<string, unknown>>;
  components?: {
    schemas?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    responses?: Record<string, unknown>;
    requestBodies?: Record<string, unknown>;
  };
}

export class OpenApiParser {
  private spec: RawOpenApiSpec;

  constructor(spec: RawOpenApiSpec) {
    this.spec = spec;
  }

  /**
   * Resolves a JSON pointer / $ref inside the specification.
   */
  public resolveRef<T = OpenApiSchema>(ref: string): T | null {
    if (!ref || !ref.startsWith("#/")) return null;
    const parts = ref.replace("#/", "").split("/");
    let current: unknown = this.spec;
    for (const part of parts) {
      if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return null;
      }
    }
    return current as T;
  }

  /**
   * Recursively deep-resolves schemas and handles $ref references.
   */
  public resolveSchema(schema?: OpenApiSchema, depth = 0): OpenApiSchema | undefined {
    if (!schema || depth > 8) return schema;

    if (schema.$ref) {
      const resolved = this.resolveRef<OpenApiSchema>(schema.$ref);
      if (resolved) {
        return this.resolveSchema({ ...resolved }, depth + 1);
      }
    }

    if (schema.properties) {
      const resolvedProps: Record<string, OpenApiSchema> = {};
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        resolvedProps[propName] = this.resolveSchema(propSchema, depth + 1) || propSchema;
      }
      return { ...schema, properties: resolvedProps };
    }

    if (schema.items) {
      return { ...schema, items: this.resolveSchema(schema.items, depth + 1) };
    }

    if (schema.allOf) {
      return {
        ...schema,
        allOf: schema.allOf.map((sub) => this.resolveSchema(sub, depth + 1) || sub),
      };
    }

    return schema;
  }

  private categorize(path: string): {
    category: "distributions" | "fin" | "interact" | "fileact" | "other";
    subCategory: string;
  } {
    const normalized = path.toLowerCase();

    if (normalized.startsWith("/distributions")) {
      return { category: "distributions", subCategory: "Distributions" };
    }

    if (normalized.startsWith("/fin")) {
      if (normalized.includes("/transmission-reports")) {
        return { category: "fin", subCategory: "Transmission Reports" };
      }
      if (normalized.includes("/delivery-reports")) {
        return { category: "fin", subCategory: "Delivery Reports" };
      }
      if (normalized.includes("/delivery-notifications")) {
        return { category: "fin", subCategory: "Delivery Notifications" };
      }
      if (normalized.includes("/archives")) {
        return { category: "fin", subCategory: "Archives" };
      }
      if (normalized.includes("/exports")) {
        return { category: "fin", subCategory: "Exports" };
      }
      return { category: "fin", subCategory: "Messages" };
    }

    if (normalized.startsWith("/interact")) {
      if (
        normalized.includes("/transmission-reports") ||
        normalized.includes("/delivery-reports") ||
        normalized.includes("/delivery-notifications") ||
        normalized.includes("/exports")
      ) {
        return { category: "interact", subCategory: "Reports" };
      }
      if (normalized.includes("/archives")) {
        return { category: "interact", subCategory: "Archives" };
      }
      return { category: "interact", subCategory: "Messages" };
    }

    if (normalized.startsWith("/fileact")) {
      if (normalized.includes("/transfers")) {
        return { category: "fileact", subCategory: "Transfers" };
      }
      if (normalized.includes("/reports") || normalized.includes("/transmission-reports") || normalized.includes("/delivery-reports")) {
        return { category: "fileact", subCategory: "Reports" };
      }
      if (normalized.includes("/archives")) {
        return { category: "fileact", subCategory: "Archives" };
      }
      if (normalized.includes("/exports")) {
        return { category: "fileact", subCategory: "Exports" };
      }
      return { category: "fileact", subCategory: "Transfers" };
    }

    return { category: "other", subCategory: "General" };
  }

  /**
   * Parse all paths in the specification into normalized endpoint descriptors.
   */
  public parseEndpoints(): NormalizedEndpoint[] {
    const endpoints: NormalizedEndpoint[] = [];
    const validMethods: HttpMethod[] = ["get", "post", "put", "delete", "patch"];

    if (!this.spec.paths) return endpoints;

    for (const [path, pathItem] of Object.entries(this.spec.paths)) {
      if (!pathItem || typeof pathItem !== "object") continue;

      const pathLevelParams: OpenApiParameter[] = Array.isArray((pathItem as Record<string, unknown>).parameters)
        ? ((pathItem as Record<string, unknown>).parameters as OpenApiParameter[])
        : [];

      for (const [methodKey, operationObj] of Object.entries(pathItem)) {
        const method = methodKey.toLowerCase() as HttpMethod;
        if (!validMethods.includes(method)) continue;

        const op = operationObj as Record<string, unknown>;
        const operationId = (op.operationId as string) || `${method}_${path.replace(/[^a-zA-Z0-9]/g, "_")}`;
        const { category, subCategory } = this.categorize(path);

        const opParams: OpenApiParameter[] = Array.isArray(op.parameters)
          ? (op.parameters as OpenApiParameter[])
          : [];

        // Merge path-level and operation-level parameters, resolving refs
        const mergedParams = [...pathLevelParams, ...opParams].map((p) => {
          if ((p as { $ref?: string }).$ref) {
            const resolved = this.resolveRef<OpenApiParameter>((p as { $ref?: string }).$ref || "");
            return resolved || p;
          }
          if (p.schema) {
            return { ...p, schema: this.resolveSchema(p.schema) };
          }
          return p;
        });

        // Resolve requestBody
        let requestBody: OpenApiRequestBody | undefined;
        if (op.requestBody) {
          const rawRb = op.requestBody as Record<string, unknown>;
          const contentMap: Record<string, { schema: OpenApiSchema; example?: unknown }> = {};

          if (rawRb.content && typeof rawRb.content === "object") {
            for (const [mediaType, mediaObj] of Object.entries(rawRb.content as Record<string, { schema?: OpenApiSchema; example?: unknown }>)) {
              contentMap[mediaType] = {
                schema: this.resolveSchema(mediaObj.schema) || {},
                example: mediaObj.example,
              };
            }
          }

          requestBody = {
            description: rawRb.description as string,
            required: Boolean(rawRb.required),
            content: contentMap,
          };
        }

        // Responses
        const responses: Record<string, OpenApiResponse> = {};
        if (op.responses && typeof op.responses === "object") {
          for (const [code, respObj] of Object.entries(op.responses as Record<string, Record<string, unknown>>)) {
            responses[code] = {
              description: respObj.description as string,
            };
          }
        }

        endpoints.push({
          id: operationId,
          operationId,
          method,
          path,
          category,
          subCategory,
          summary: (op.summary as string) || `${method.toUpperCase()} ${path}`,
          description: (op.description as string) || "",
          tags: Array.isArray(op.tags) ? (op.tags as string[]) : [category],
          parameters: mergedParams,
          requestBody,
          responses,
          deprecated: Boolean(op.deprecated),
        });
      }
    }

    return endpoints;
  }
}
