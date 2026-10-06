import React, { useState, useEffect } from 'react';
import {
  RadioTower,
  Radio,
  Shield,
  Activity,
  ArrowRight,
  Battery,
  Wifi,
  Play,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';
import { INITIAL_MESH_NODES, meshService } from '../services/meshService';
import type { MeshNode, MeshPacket } from '../types/mesh';

interface MeshNetworkPageProps {
  selectedAlertId?: string | null;
}

export const MeshNetworkPage: React.FC<MeshNetworkPageProps> = ({ selectedAlertId }) => {
  const [nodes, setNodes] = useState<MeshNode[]>(INITIAL_MESH_NODES);
  const [activePacket, setActivePacket] = useState<MeshPacket | null>(null);
  const [packetHistory, setPacketHistory] = useState<MeshPacket[]>([]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [currentHopIndex, setCurrentHopIndex] = useState<number>(0);

  // Initialize with a simulation packet if selectedAlertId is passed or on start
  useEffect(() => {
    const pkt = meshService.createSimulationPacket(
      selectedAlertId || 'sim-ref-live',
      'Medical Beacon'
    );
    setActivePacket(pkt);
  }, [selectedAlertId]);

  const triggerPacketFlow = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setCurrentHopIndex(0);

    const pkt = meshService.createSimulationPacket(
      selectedAlertId || 'sim-ref-' + Math.random().toString(36).substring(2, 6),
      'Flood / Water Distress'
    );
    setActivePacket(pkt);

    // Simulate hop-by-hop relay
    const hopOrder = ['node-user', 'node-relay-a', 'node-relay-b', 'node-sink'];
    let step = 0;

    const interval = setInterval(() => {
      step++;
      if (step < hopOrder.length) {
        setCurrentHopIndex(step);
        setActivePacket((prev) =>
          prev
            ? {
                ...prev,
                hopCount: step,
                routeHistory: [...prev.routeHistory, hopOrder[step]],
                status: 'relayed',
              }
            : null
        );
      } else {
        clearInterval(interval);
        setIsSimulating(false);
        setActivePacket((prev) =>
          prev
            ? {
                ...prev,
                status: 'delivered',
              }
            : null
        );
        setPacketHistory((prev) => [
          {
            ...pkt,
            hopCount: 3,
            routeHistory: hopOrder,
            status: 'delivered',
          },
          ...prev.slice(0, 9),
        ]);
      }
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title Header */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <RadioTower className="w-6 h-6 text-slate-900" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Decentralized Mesh Network Simulator
            </h1>
          </div>
          <p className="text-sm text-slate-600 font-serif italic mt-1">
            Simulated ad-hoc packet hop routing for disaster environments without cellular infrastructure
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={triggerPacketFlow}
            disabled={isSimulating}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-bold transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
          >
            <Play className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
            <span>{isSimulating ? 'Simulating Relay Flow...' : 'Transmit Test Packet'}</span>
          </button>
        </div>
      </div>

      {/* Mandatory Safety Notice */}
      <div className="p-4 bg-amber-50 border border-amber-300 rounded-lg text-xs text-amber-900 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Abstract Architecture Simulation Notice: </span>
          This visualization uses simulated software packet routing. It does not implement physical browser Bluetooth or Wi-Fi Direct. The "Simulated Rescue Command Node" is an algorithmic prototype endpoint and is not connected to official NDRF, police, ambulance, or government dispatch systems.
        </div>
      </div>

      {/* Mesh Nodes Visualizer Card */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Active Multi-Hop Topology (Linear Relay Chain)
          </h3>
          <span className="text-xs text-slate-500 font-serif">
            Current Hop Step: {currentHopIndex} of 3 • Packet Ref:{' '}
            <span className="font-mono text-slate-800">{activePacket?.packetId || 'N/A'}</span>
          </span>
        </div>

        {/* Animated Relay Node Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
          {nodes.map((node, idx) => {
            const isCurrentHop = isSimulating && currentHopIndex === idx;
            const isCompletedHop = !isSimulating && activePacket?.status === 'delivered';
            const isPassedHop = isSimulating && currentHopIndex > idx;

            return (
              <div
                key={node.id}
                className={`p-5 rounded-xl border-2 transition-all relative flex flex-col justify-between ${
                  isCurrentHop
                    ? 'border-red-600 bg-red-50/50 shadow-md ring-2 ring-red-200'
                    : isPassedHop || isCompletedHop
                    ? 'border-emerald-500 bg-emerald-50/30'
                    : 'border-slate-200 bg-slate-50/60'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                        node.role === 'user'
                          ? 'bg-blue-100 text-blue-900'
                          : node.role === 'sink'
                          ? 'bg-purple-100 text-purple-900'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {node.role === 'sink' ? 'Simulated Sink' : node.role.toUpperCase()}
                    </span>

                    <span className="text-xs text-slate-500 font-mono">
                      Hop #{node.hopsFromSource}
                    </span>
                  </div>

                  <h4 className="text-sm font-bold text-slate-900">{node.name}</h4>
                  <p className="text-xs text-slate-600 font-serif mt-1">{node.description}</p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1 font-mono">
                    <Battery className="w-3.5 h-3.5 text-emerald-600" />
                    {node.batteryLevel}%
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Wifi className="w-3.5 h-3.5 text-blue-600" />
                    {node.rssiSignal} dBm
                  </span>
                </div>

                {/* Packet pulse badge if active */}
                {isCurrentHop && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-red-600 text-white rounded-full text-[10px] font-bold shadow-md animate-pulse">
                    Relaying Packet
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Packet Flow Telemetry Bar */}
        <div className="p-4 bg-slate-900 text-white rounded-lg text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Packet Telemetry Buffer
            </span>
            <span className="font-mono text-slate-400">
              Status: {activePacket?.status.toUpperCase() || 'IDLE'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-[11px] text-slate-300 font-mono border-t border-slate-800">
            <div>
              <span className="text-slate-500">Source: </span>
              {activePacket?.sourceNodeId}
            </div>
            <div>
              <span className="text-slate-500">Destination: </span>
              {activePacket?.targetNodeId}
            </div>
            <div>
              <span className="text-slate-500">Path: </span>
              {activePacket?.routeHistory.join(' → ') || 'Pending'}
            </div>
          </div>
        </div>
      </div>

      {/* Packet Transmission History Log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Recent Packet Relays Log
          </span>
          <span className="text-xs text-slate-500 font-serif">Simulated in-memory buffer</span>
        </div>

        {packetHistory.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 italic">
            No packet relays completed yet. Click "Transmit Test Packet" above to run a multi-hop demonstration.
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {packetHistory.map((pkt, i) => (
              <div key={i} className="p-4 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-800 font-mono">{pkt.packetId}</div>
                  <div className="text-slate-500">{pkt.payloadSummary}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-600">{pkt.hopCount} hops</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    DELIVERED
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
