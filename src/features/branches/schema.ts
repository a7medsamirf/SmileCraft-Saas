import { z } from "zod";

export const branchFormSchema = z.object({
  name: z.string().min(2, "اسم الفرع مطلوب (حرفين على الأقل)"),
  code: z.string().min(2, "كود الفرع مطلوب (حرفين على الأقل)").max(20),
  address: z.string().optional(),
  phone: z.string().optional(),
  managerName: z.string().optional(),
  isActive: z.boolean(),
});

export type BranchFormValues = z.infer<typeof branchFormSchema>;
