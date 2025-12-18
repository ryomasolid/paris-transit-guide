export interface Station {
  id: string;
  name: string;
}

export interface Line {
  id: string;
  code: string;
  color: string;
  name: string;
  mode: string;
  category: 'METRO' | 'RER' | 'TRAM' | 'OTHER';
}

export interface Section {
  type: 'public_transport' | 'street_network' | 'waiting' | 'transfer';
  departureTime: Date;
  arrivalTime: Date;
  duration: number;
  mode?: string;
  lineCode?: string;
  lineColor?: string;
  fromName: string;
  toName: string;
  stops: Station[];
}

export interface RouteModel {
  departureTime: Date;
  arrivalTime: Date;
  duration: number;
  sections: Section[];
}