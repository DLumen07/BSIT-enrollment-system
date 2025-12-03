'use client';

import { motion } from 'framer-motion';
import React from 'react';

const VerticalFiberLines = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="v-fiber-blue" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0)" />
            <stop offset="50%" stopColor="rgba(59, 130, 246, 0.6)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
          </linearGradient>
          <linearGradient id="v-fiber-orange" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(249, 115, 22, 0)" />
            <stop offset="50%" stopColor="rgba(249, 115, 22, 0.6)" />
            <stop offset="100%" stopColor="rgba(249, 115, 22, 0)" />
          </linearGradient>
        </defs>
        
        {Array.from({ length: 6 }).map((_, i) => {
          const xStart = 10 + i * 15;
          const xEnd = 20 + i * 12;
          const controlX = 50 + (i % 2 === 0 ? 20 : -20);
          
          return (
            <g key={i}>
              <path
                d={`M ${xStart} -10 Q ${controlX} 50 ${xEnd} 110`}
                fill="none"
                stroke="rgba(255,255,255,0.03)"
                strokeWidth="0.5"
              />
              <motion.path
                d={`M ${xStart} -10 Q ${controlX} 50 ${xEnd} 110`}
                fill="none"
                stroke={i % 2 === 0 ? "url(#v-fiber-blue)" : "url(#v-fiber-orange)"}
                strokeWidth="1"
                strokeLinecap="round"
                initial={{ pathLength: 0.3, pathOffset: 0, opacity: 0 }}
                animate={{ 
                  pathOffset: [0, 1],
                  opacity: [0, 0.5, 0.5, 0]
                }}
                transition={{ 
                  duration: 3 + i * 0.5, 
                  repeat: Infinity, 
                  ease: "linear",
                  delay: i * 0.3
                }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const SidebarGrid = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Base Grid */}
      <div 
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #3b82f6 1px, transparent 1px),
            linear-gradient(to bottom, #3b82f6 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      />
    </div>
  );
};

const TechDecorations = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {/* Top Right Corner Accent */}
            <div className="absolute top-0 right-0 w-16 h-16 border-t border-r border-blue-500/30 rounded-tr-xl" />
            
            {/* Bottom Left Corner Accent */}
            <div className="absolute bottom-0 left-0 w-16 h-16 border-b border-l border-orange-500/30 rounded-bl-xl" />

            {/* Random Hexagons */}
            <motion.div 
                className="absolute top-[15%] right-[10%] w-8 h-8 border border-blue-500/20 rotate-45"
                animate={{ rotate: [45, 225] }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            />
             <motion.div 
                className="absolute bottom-[20%] left-[15%] w-6 h-6 border border-orange-500/20 rotate-12"
                animate={{ rotate: [12, -168] }}
                transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
            />
        </div>
    )
}

export const SidebarBackground = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#020617]" />
      <SidebarGrid />
      <VerticalFiberLines />
      <TechDecorations />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,transparent_0%,#020617_90%)] pointer-events-none" />
    </div>
  );
};
