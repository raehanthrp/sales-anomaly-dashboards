export interface SalesDataPoint {
  date: string;
  sales: number;
  orders: number;
  anomalyScore?: number;
  isAnomaly?: boolean;
}

export interface IncidentNote {
  id: string;
  date: string;
  note: string;
  createdAt: string;
}

export interface AnomalyPredictionRequest {
  data: SalesDataPoint[];
  threshold: number;
}

export interface AnomalyPredictionResponse {
  data: SalesDataPoint[];
}
