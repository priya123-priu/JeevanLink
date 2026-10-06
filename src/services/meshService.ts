import type { MeshNode, MeshPacket } from '../types/mesh';

export const INITIAL_MESH_NODES: MeshNode[] = [
  {
    id: 'node-user',
    name: 'Citizen Device (Origin)',
    role: 'user',
    description: 'Local smartphone creating emergency beacon',
    status: 'active',
    hopsFromSource: 0,
    batteryLevel: 84,
    rssiSignal: -55,
    coordinates: { lat: 28.6139, lng: 77.209 },
  },
  {
    id: 'node-relay-a',
    name: 'Relay Device A (Solar Peer)',
    role: 'relay',
    description: 'Community rooftop mesh transceiver',
    status: 'idle',
    hopsFromSource: 1,
    batteryLevel: 92,
    rssiSignal: -68,
    coordinates: { lat: 28.6162, lng: 77.2115 },
  },
  {
    id: 'node-relay-b',
    name: 'Relay Device B (Mobile Node)',
    role: 'relay',
    description: 'Volunteer vehicle mesh repeater',
    status: 'idle',
    hopsFromSource: 2,
    batteryLevel: 76,
    rssiSignal: -74,
    coordinates: { lat: 28.6195, lng: 77.2148 },
  },
  {
    id: 'node-sink',
    name: 'Simulated Rescue Command Node',
    role: 'sink',
    description: 'Prototype rescue endpoint (Simulated - No official NDRF/Police dispatch)',
    status: 'idle',
    hopsFromSource: 3,
    batteryLevel: 99,
    rssiSignal: -60,
    coordinates: { lat: 28.6231, lng: 77.2185 },
  },
];

export const meshService = {
  createSimulationPacket(alertId: string, emergencyType: string): MeshPacket {
    return {
      packetId: `pkt-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      sourceNodeId: 'node-user',
      targetNodeId: 'node-sink',
      payloadType: 'SOS_BEACON',
      hopCount: 0,
      maxHops: 5,
      routeHistory: ['node-user'],
      timestamp: new Date().toISOString(),
      payloadSummary: `SOS [${emergencyType}] Alert Ref: ${alertId.substring(0, 8)}`,
      status: 'transmitting',
    };
  },
};
