export type BranchData = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

export type BranchFull = {
  id: string;
  clinicId: string;
  name: string;
  code: string;
  address: string | null;
  phone: string | null;
  managerName: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: {
    patients: number;
    appointments: number;
    users: number;
  };
};
