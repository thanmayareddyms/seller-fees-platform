export type AuditStatus = 'IN_PROGRESS' | 'COMPLETED' | 'EXPIRED';

export type GeoEditorEvent = {
  caseId: string;
  auditor: string;
  status: AuditStatus;
  startedAt?: string;
  completedAt?: string;
  occurredAt: string;
};

export type DashboardFilters = {
  period?: 'today' | 'week' | 'month';
  date?: string;
  auditor?: string;
};

export type AuditRecord = {
  caseId: string;
  auditor: string;
  auditDate: string;
  status: AuditStatus;
  startedAt?: string;
  completedAt?: string;
  auditMinutes: number;
  revertCount: number;
  qualityScore?: number;
};
