export interface MeshNode {
  id: string;
  name: string;
  role: 'user' | 'relay' | 'sink';
  description: string;
  status: 'active' | 'forwarding' | 'idle' | 'offline';
  hopsFromSource: number;
  batteryLevel: number;
  rssiSignal: number; // dBm
  coordinates?: { lat: number; lng: number };
}

export interface MeshPacket {
  packetId: string;
  sourceNodeId: string;
  targetNodeId: string;
  payloadType: 'SOS_BEACON' | 'ACK' | 'RELAY_TELEMETRY';
  hopCount: number;
  maxHops: number;
  routeHistory: string[];
  timestamp: string;
  payloadSummary: string;
  status: 'transmitting' | 'relayed' | 'delivered' | 'dropped';
}
