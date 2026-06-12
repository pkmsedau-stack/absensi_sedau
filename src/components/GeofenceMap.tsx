import React from "react";
import { Compass, MapPin, ShieldCheck, ShieldAlert } from "lucide-react";

interface GeofenceMapProps {
  centerLat: number;
  centerLng: number;
  userLat: number;
  userLng: number;
  radiusMeter: number;
  distance: number;
  isWithinRadius: boolean;
  username?: string;
}

export default function GeofenceMap({
  centerLat,
  centerLng,
  userLat,
  userLng,
  radiusMeter,
  distance,
  isWithinRadius,
  username = "Karyawan"
}: GeofenceMapProps) {
  // Let's project coordinates into simple SVG offsets (x, y)
  // 1 degree of lat/lng is ~111,000 meters
  const METERS_PER_DEGREE = 111000;
  
  const dy = (userLat - centerLat) * METERS_PER_DEGREE; // meters North (positive) or South (negative)
  const dx = (userLng - centerLng) * METERS_PER_DEGREE * Math.cos(centerLat * Math.PI / 180); // meters East/West
  
  // Outer SVG size is 300x300. SVG center is (150, 150).
  const svgCenter = 150;
  
  // We want the rule radius to be represented visually. Let's make the radius look consistent (e.g., 60px of the canvas)
  // This means 1px = radiusMeter / 60 meters.
  const pixelsPerMeter = radiusMeter > 0 ? 60 / radiusMeter : 0.6;
  
  // Calculate scaled offset point
  const userX = svgCenter + dx * pixelsPerMeter;
  // dy in SVG goes down for positive, so we subtract
  const userY = svgCenter - dy * pixelsPerMeter;
  
  // Constrain coordinates within bounds of map so we don't clip entirely
  const constrainedX = Math.max(20, Math.min(280, userX));
  const constrainedY = Math.max(20, Math.min(280, userY));
  
  const isClipped = userX !== constrainedX || userY !== constrainedY;

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-sans flex flex-col gap-3 relative overflow-hidden shadow-lg">
      <div className="absolute top-[-30px] right-[-30px] w-24 h-24 bg-teal-500/10 rounded-full blur-xl pointer-events-none"></div>
      
      {/* Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 pb-1">
          <Compass className="w-4 h-4 text-teal-400 animate-spin" style={{ animationDuration: "12s" }} />
          <span className="text-[11px] font-black tracking-widest uppercase text-slate-300">GEO-PETA SATELIT LIVE</span>
        </div>
        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold font-sans tracking-wide uppercase ${
          isWithinRadius 
            ? "bg-teal-500/20 text-teal-400 border border-teal-500/30" 
            : "bg-red-500/20 text-red-400 border border-red-500/30"
        }`}>
          {isWithinRadius ? "Absen Valid" : "Di Luar Batas"}
        </span>
      </div>

      {/* SVG Canvas Map */}
      <div className="relative w-full h-[220px] bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
        {/* Background Grid Lines representing coordinates */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:20px_20px] opacity-35 pointer-events-none"></div>
        
        {/* Radar concentric circular waves */}
        <div className="absolute w-44 h-44 rounded-full border border-teal-500/5 animate-ping opacity-25"></div>
        
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 300" preserveAspectRatio="none">
          {/* Compass Rings */}
          <circle cx="150" cy="150" r="110" fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="150" cy="150" r="85" fill="none" stroke="#1e293b" strokeWidth="1" />
          
          {/* Geofence Boundary Circle (Radius) */}
          <circle 
            cx="150" 
            cy="150" 
            r={60} 
            fill="rgba(20, 184, 166, 0.12)" 
            stroke="#14b8a6" 
            strokeWidth="2" 
            strokeDasharray="4 2"
          />
          <text x="150" y="222" textAnchor="middle" fill="#0d9488" fontSize="8" fontWeight="bold" fontFamily="monospace">
            Batas Radius {radiusMeter}m
          </text>

          {/* Coordinate Crosshairs */}
          <line x1="150" y1="20" x2="150" y2="280" stroke="#334155" strokeWidth="0.5" strokeDasharray="1 4" />
          <line x1="20" y1="150" x2="280" y2="150" stroke="#334155" strokeWidth="0.5" strokeDasharray="1 4" />
          
          {/* Center hospital representation (UPT Puskesmas Sedau) */}
          <g transform="translate(150, 150)">
            <circle cx="0" cy="0" r="9" fill="#1e293b" stroke="#0ea5e9" strokeWidth="1.5" />
            <circle cx="0" cy="0" r="3" fill="#0ea5e9" />
            <path d="M-5 -2 H5 V2 H-5 Z M-2 -5 H2 V5 H-2 Z" fill="#ef4444" opacity="0.8" />
          </g>
          
          {/* Connective Line (Distance Ruler) */}
          <line 
            x1="150" 
            y1="150" 
            x2={constrainedX} 
            y2={constrainedY} 
            stroke={isWithinRadius ? "#14b8a6" : "#f43f5e"} 
            strokeWidth="1.5" 
            strokeDasharray="4 3" 
          />
          
          {/* Midpoint Distance Badge on line */}
          <g transform={`translate(${(150 + constrainedX) / 2}, ${(150 + constrainedY) / 2})`}>
            <rect x="-24" y="-7" width="48" height="13" rx="4" fill="#0f172a" stroke={isWithinRadius ? "#14b8a6" : "#f43f5e"} strokeWidth="1" />
            <text x="0" y="3" textAnchor="middle" fill="#f8fafc" fontSize="8" fontWeight="black" fontFamily="monospace">
              {distance}m
            </text>
          </g>

          {/* Employee Pin */}
          <g transform={`translate(${constrainedX}, ${constrainedY})`}>
            <circle cx="0" cy="0" r="8" fill={isWithinRadius ? "#14b8a6" : "#ef4444"} className="animate-pulse" />
            <circle cx="0" cy="0" r="4" fill="#ffffff" />
            
            {/* If location has been clipped, draw boundary indicator */}
            {isClipped && (
              <text x="0" y="-12" textAnchor="middle" fill="#ef4444" fontSize="8" fontWeight="bold">
                (Arah Luar)
              </text>
            )}
          </g>
        </svg>

        {/* Floating Mini Compass & Coordinates Indicator */}
        <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-xs px-2 py-1 rounded-md border border-slate-800 text-[8px] font-mono text-slate-400">
          <span className="block text-white font-bold">PUSKESMAS SEDAU CENTER</span>
          <span>{centerLat.toFixed(5)}, {centerLng.toFixed(5)}</span>
        </div>

        {/* Floating User position coordinate card */}
        <div className="absolute top-2 left-2 bg-slate-950/80 backdrop-blur-xs px-2 py-1 rounded-md border border-slate-800 text-[8px] font-mono text-slate-400">
          <span className="block text-cyan-400 font-bold">{username.toUpperCase()} GPS</span>
          <span>{userLat.toFixed(5)}, {userLng.toFixed(5)}</span>
        </div>
      </div>

      {/* Distance Description Label */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] leading-tight">
        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-2.5 flex items-center gap-2">
          {isWithinRadius ? (
            <ShieldCheck className="w-5 h-5 text-teal-400 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
          )}
          <div>
            <span className="block font-bold text-slate-200">Ke Puskesmas: {distance.toLocaleString("id-ID")} Meter</span>
            <span className="text-slate-400 text-[9px]">
              {isWithinRadius 
                ? `Memenuhi syarat presensi (Batas ${radiusMeter}m)` 
                : `Terlalu jauh! Lewati batas toleransi ${radiusMeter}m`}
            </span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-2.5 flex flex-col justify-center">
          <div className="flex justify-between">
            <span className="text-slate-400">Pusat Koordinat:</span>
            <span className="font-mono text-white text-[9px]">{centerLat.toFixed(4)}, {centerLng.toFixed(4)}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-slate-400">Radius Diizinkan:</span>
            <span className="font-bold text-teal-400">{radiusMeter} Meter</span>
          </div>
        </div>
      </div>
    </div>
  );
}
