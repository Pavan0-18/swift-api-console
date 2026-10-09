export type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

export interface OpenApiParameter {
  name: string;
  in: "query" | "header" | "path" | "cookie";
  description?: string;
  required?: boolean;
  schema?: OpenApiSchema;
  example?: unknown;
}

export interface OpenApiProperty {
  type?: string;
  description?: string;
  format?: string;
  example?: unknown;
  enum?: string[];
  items?: OpenApiSchema;
  properties?: Record<string, OpenApiProperty>;
  required?: string[];
  $ref?: string;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  default?: unknown;
}

export interface OpenApiSchema extends OpenApiProperty {
  title?: string;
  allOf?: OpenApiSchema[];
  oneOf?: OpenApiSchema[];
  anyOf?: OpenApiSchema[];
}

export interface OpenApiRequestBody {
  description?: string;
  required?: boolean;
  content?: Record<string, { schema: OpenApiSchema; example?: unknown }>;
}

export interface OpenApiResponse {
  description?: string;
  content?: Record<string, { schema?: OpenApiSchema; example?: unknown }>;
}

export interface NormalizedEndpoint {
  id: string;
  operationId: string;
  method: HttpMethod;
  path: string;
  category: "distributions" | "fin" | "interact" | "fileact" | "other";
  subCategory?: string;
  summary: string;
  description: string;
  tags: string[];
  parameters: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  responses: Record<string, OpenApiResponse>;
  deprecated?: boolean;
}

export interface ApiCategoryGroup {
  id: string;
  name: string;
  description: string;
  subCategories: {
    id: string;
    name: string;
    endpoints: NormalizedEndpoint[];
  }[];
  endpoints: NormalizedEndpoint[];
}
