import { z } from 'zod';

const EnvSchema = z.object({
  BASE_URL: z.string().url().default("http://localhost:3000"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GEMINI_API_KEY: z.string().min(1).optional(),  
})

export const env = EnvSchema.parse(process.env);