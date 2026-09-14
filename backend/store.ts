import type { AuditRecord, DashboardFilters, GeoEditorEvent } from './types';

type Listener = () => void;

const audits = new Map<string, AuditRecord>();
const listeners = new Set<Listener>();

const isoDate = (value = new Date()) => value.toISOString().slice(0, 10);

export const store = {
  applyGeoEditorEvent(event: GeoEditorEvent) {
    const current = audits.get(event.caseId);
    const startedAt = event.startedAt ?? current?.startedAt;
    const completedAt = event.completedAt ?? current?.completedAt;
    const auditMinutes = startedAt && completedAt
      ? Math.max(0, Math.round((Date.parse(completedAt) - Date.parse(startedAt)) / 60000))
      : current?.auditMinutes ?? 0;

    audits.set(event.caseId, {
      caseId: event.caseId,
      auditor: event.auditor,
      auditDate: current?.auditDate ?? isoDate(event.startedAt ? new Date(event.startedAt) : new Date(event.occurredAt)),
      status: event.status,
      startedAt,
      completedAt,
      auditMinutes,
      revertCount: current?.revertCount ?? 0,
      qualityScore: current?.qualityScore
    });
    listeners.forEach(listener => listener());
  },

  applyRevert(caseId: string, originalAuditDate?: string) {
    const current = audits.get(caseId);
    if (current) {
      current.revertCount += 1;
    } else {
      audits.set(caseId, {
        caseId, auditor: 'Unknown', auditDate: originalAuditDate ?? isoDate(),
        status: 'COMPLETED', auditMinutes: 0, revertCount: 1
      });
    }
    listeners.forEach(listener => listener());
  },

  applyQuality(caseId: string, score: number) {
    const current = audits.get(caseId);
    if (current) current.qualityScore = score;
    listeners.forEach(listener => listener());
  },

  onChange(listener: Listener) { listeners.add(listener); return () => listeners.delete(listener); },

  integrationStatus() {
    return { connected: false, provider: 'Geo Editor', message: 'Awaiting approved Geo Editor integration' };
  },

  dashboard(filters: DashboardFilters = {}) {
    const now = new Date();
    const today = isoDate(now);
    const start = filters.period === 'month'
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : filters.period === 'week'
        ? new Date(now.getTime() - 6 * 86400000)
        : new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const records = [...audits.values()].filter(a => {
      if (filters.auditor && filters.auditor !== 'all' && a.auditor !== filters.auditor) return false;
      if (filters.date) return a.auditDate === filters.date;
      return a.auditDate >= isoDate(start) && a.auditDate <= today;
    });

    const completed = records.filter(a => a.status === 'COMPLETED').length;
    const inProgress = records.filter(a => a.status === 'IN_PROGRESS').length;
    const expired = records.filter(a => a.status === 'EXPIRED').length;
    const reverted = records.reduce((n, a) => n + a.revertCount, 0);
    const qualityValues = records.map(a => a.qualityScore).filter((x): x is number => x !== undefined);

    const byAuditor = new Map<string, typeof records>();
    records.forEach(a => byAuditor.set(a.auditor, [...(byAuditor.get(a.auditor) ?? []), a]));

    return {
      updatedAt: new Date().toISOString(),
      source: 'Geo Editor integration',
      completed, inProgress, expired, reverted,
      totalAuditMinutes: records.reduce((n, a) => n + a.auditMinutes, 0),
      quality: qualityValues.length ? Number((qualityValues.reduce((a, b) => a + b, 0) / qualityValues.length).toFixed(1)) : null,
      auditors: [...byAuditor.entries()].map(([name, rows]) => ({
        name,
        completed: rows.filter(a => a.status === 'COMPLETED').length,
        inProgress: rows.filter(a => a.status === 'IN_PROGRESS').length,
        expired: rows.filter(a => a.status === 'EXPIRED').length,
        reverted: rows.reduce((n, a) => n + a.revertCount, 0),
        auditMinutes: rows.reduce((n, a) => n + a.auditMinutes, 0),
        quality: (() => {
          const q = rows.map(a => a.qualityScore).filter((x): x is number => x !== undefined);
          return q.length ? Number((q.reduce((a, b) => a + b, 0) / q.length).toFixed(1)) : null;
        })()
      }))
    };
  }
};
