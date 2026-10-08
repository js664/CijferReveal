export type Family = 'progression' | 'exam';
export type Surface = 'recent' | 'overview' | 'subject' | 'averages' | 'exam-context' | 'publication';
export interface ResultRecord { id: string; family: Family; selfType: string; type?: string; columnType?: string; columnId?: string; cohortId?: string; variant?: 'attempt-1'|'attempt-2'|'current'|'alternative-first'|'alternative-attempt-1'|'alternative-attempt-2'; value: string; isCijfer: boolean; isLabel: boolean; subject: string; subjectId: string; description: string; date: string; weight: string; period: string; testCode: string; aggregate: boolean; }
export interface Observation { protocol: 'po/1'; surface: Surface; scope: string | null; records: ResultRecord[]; complete: false; }
export interface DisplayResult { key: string; version: string; subject: string; description: string; date: string; weight: string; value: string; grade: number | null; }
