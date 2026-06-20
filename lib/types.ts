export type UserRole = "driver" | "company_admin";
export type LRStatus = "pending" | "approved" | "rejected" | "in_transit" | "delivered";
export type PaymentMode = "To Pay" | "Paid" | "To Be Billed";

export interface User {
  id: string;
  name: string;
  role: UserRole;
  companyId: string | null;
  branchId: string | null;
  mobile: string;
  company?: { id: string; name: string; lrCode?: string };
  branch?: { id: string; name: string; city: string };
}

export interface Company {
  id: string;
  name: string;
  address: string;
  gstNumber: string;
  lrCode: string;
  contactPhone?: string;
  logoUrl?: string;
  stampUrl?: string;
  maxBranches: number;
  maxDrivers: number;
  maxLrPerMonth: number;
  status: "active" | "suspended";
}

export interface DashboardStats {
  totalLrs: number;
  pending: number;
  approved: number;
  rejected: number;
  delivered: number;
  inTransit: number;
  freightTotal: number;
  approvalRate: number;
}

export interface LRRequest {
  id: string;
  lrNumber: string | null;
  trackingId: string;
  consignorName: string;
  consignorAddress: string;
  consigneeName: string;
  consigneeAddress: string;
  consigneePhone: string;
  originCity: string;
  destinationCity: string;
  vehicleNumber: string;
  goodsDescription: string;
  noOfPackages: number;
  weightKg: number;
  declaredValue: number;
  freightAmount: number;
  paymentMode: string;
  dispatchDate: string;
  specialInstructions?: string;
  photos: string[];
  signatureUrl?: string;
  status: LRStatus;
  rejectionReason?: string;
  pdfUrl?: string;
  createdAt: string;
  driver?: { name: string; mobile?: string };
}
