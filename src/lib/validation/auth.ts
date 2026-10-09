import { z } from "zod";

export const connectSwiftSchema = z
  .object({
    environment: z.enum(["sandbox", "test", "production"], {
      required_error: "Please select a SWIFT environment",
    }),
    mode: z.enum(["oauth", "token", "simulate"]),
    consumerKey: z.string().max(256).optional(),
    consumerSecret: z.string().max(512).optional(),
    scope: z.string().max(256).optional(),
    subject: z.string().max(512).optional(),
    directToken: z.string().max(4096).optional(),
    privateKeyPem: z.string().optional(),
    certificatePem: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "oauth") {
      if (!data.consumerKey || data.consumerKey.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["consumerKey"],
          message: "Consumer Key is required for OAuth authentication",
        });
      }
      if (!data.consumerSecret || data.consumerSecret.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["consumerSecret"],
          message: "Consumer Secret is required for OAuth authentication",
        });
      }
    } else if (data.mode === "token") {
      if (!data.directToken || data.directToken.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["directToken"],
          message: "Bearer Access Token is required",
        });
      }
    }
  });

export type ConnectSwiftInput = z.infer<typeof connectSwiftSchema>;
