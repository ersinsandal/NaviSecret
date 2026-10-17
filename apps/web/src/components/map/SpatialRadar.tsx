import React, { useState, useMemo } from 'react';
import { NaviIcon } from '@/components/common/NaviIcons';
import { calculateDistance } from '@navisecret/sdk';

export interface RadarTarget {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: 'friend' | 'capsule';
}

interface SpatialRadarProps {
  currentLocation: { lat: number; lon: number; accuracy: number } | null;
  targets: RadarTarget[];
  onOpenPulseRadar: () => void;
}

export const SpatialRadar: React.FC<SpatialRadarProps> = ({
  currentLocation,
  targets,
  onOpenPulseRadar,
}) => {
  const [rangeMode, setRangeMode] = useState<500 | 1000 | 2000>(500);

  // Compute relative polar coordinates (distance and bearing) for nearby targets
  const blips = useMemo(() => {
    if (!currentLocation) return [];

    return targets
      .map((t) => {
        const dist = calculateDistance(currentLocation.lat, currentLocation.lon, t.lat, t.lon);
        if (dist > rangeMode) return null;

        // Calculate bearing angle (in radians)
        const dLon = ((t.lon - currentLocation.lon) * Math.PI) / 180;
        const lat1 = (currentLocation.lat * Math.PI) / 180;
        const lat2 = (t.lat * Math.PI) / 180;

        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
        const bearing = Math.atan2(y, x); // -PI to +PI

        // Normalized radial distance (0 to 1)
        const normDist = Math.min(dist / rangeMode, 0.92);

        // Convert to Cartesian X/Y in radar circle (-40 to +40 px, centered at 0,0)
        const radius = 34; // radar radius in px
        const blipX = Math.sin(bearing) * (normDist * radius);
        const blipY = -Math.cos(bearing) * (normDist * radius);

        return {
          id: t.id,
          name: t.name,
          dist: Math.round(dist),
          type: t.type,
          x: blipX,
          y: blipY,
        };
      })
      .filter(Boolean) as {
        id: string;
        name: string;
        dist: number;
        type: 'friend' | 'capsule';
        x: number;
        y: number;
      }[];
  }, [currentLocation, targets, rangeMode]);

  const toggleRange = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (rangeMode === 500) setRangeMode(1000);
    else if (rangeMode === 1000) setRangeMode(2000);
    else setRangeMode(500);
  };

  return (
    <div
      onClick={onOpenPulseRadar}
      className="fixed bottom-24 right-3.5 md:right-6 z-30 pointer-events-auto flex flex-col items-center cursor-pointer group select-none"
      title="360° Spatial Radar HUD — Click to open Pulse Panel"
    >
      {/* Radar Container */}
      <div className="relative w-20 h-20 rounded-full cyber-glass-heavy border border-white/15 p-1 shadow-[0_10px_35px_rgba(0,0,0,0.85)] group-hover:border-[#00F5B8]/40 transition-all duration-300">
        {/* Radar Rings Background */}
        <div className="relative w-full h-full rounded-full bg-[#03060A]/90 overflow-hidden flex items-center justify-center">
          {/* Outer ring */}
          <div className="absolute inset-1 rounded-full border border-white/10" />
          {/* Middle ring */}
          <div className="absolute w-10 h-10 rounded-full border border-dashed border-[#00F5B8]/20" />
          {/* Crosshairs */}
          <div className="absolute w-full h-[1px] bg-white/5" />
          <div className="absolute h-full w-[1px] bg-white/5" />

          {/* Sweeping Sonar Beam */}
          <div className="absolute inset-0 rounded-full animate-nexus pointer-events-none">
            <div className="w-1/2 h-1/2 origin-bottom-right bg-gradient-to-br from-transparent via-[#00F5B8]/15 to-[#00F5B8]/40 rounded-tl-full" />
          </div>

          {/* User Self Beacon (Center Dot) */}
          <div className="relative z-10 w-2 h-2 rounded-full bg-[#00F5B8] shadow-[0_0_8px_#00F5B8]" />

          {/* Target Blip Dots */}
          {blips.map((b) => (
            <div
              key={b.id}
              className="absolute z-20"
              style={{
                transform: `translate(${b.x}px, ${b.y}px)`,
              }}
              title={`${b.name} (${b.dist}m)`}
            >
              <div
                className={`w-2 h-2 rounded-full shadow-[0_0_6px] ${
                  b.type === 'capsule'
                    ? 'bg-[#FFB800] shadow-[#FFB800]'
                    : 'bg-[#00F5B8] shadow-[#00F5B8]'
                }`}
              />
            </div>
          ))}
        </div>

        {/* Range Label Badge */}
        <button
          onClick={toggleRange}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-30 px-1.5 py-0.5 rounded-full bg-[#070B12] border border-white/15 text-[9px] font-mono text-slate-300 hover:text-[#00F5B8] hover:border-[#00F5B8]/40 transition-colors"
        >
          {rangeMode}m
        </button>

        {/* Cardinal North Pointer */}
        <span className="absolute top-0.5 left-1/2 -translate-x-1/2 text-[7px] font-black text-slate-500">
          N
        </span>
      </div>
    </div>
  );
};

export default SpatialRadar;
