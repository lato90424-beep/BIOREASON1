export enum ExperimentStatus {
  NORMAL = 'NORMAL',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL'
}

export interface AnalysisResult {
  status: ExperimentStatus;
  observation: string;
  deduction: string;
  recommendation: string;
}

export type ThinkingLevel = 'LOW' | 'HIGH';

export interface AnalysisState {
  isLoading: boolean;
  result: AnalysisResult | null;
  error: string | null;
}

export interface TelemetryData {
  temperature: number;
  pressure: number;
}

export interface HistoryItem {
  timestamp: number;
  telemetry: TelemetryData;
  analysis: AnalysisResult;
}