import { z } from "zod";

export const conditionDataSchema = z.object({
  effects: z.array(z.string().min(1)).min(1),
  description: z.string().optional(),
});
