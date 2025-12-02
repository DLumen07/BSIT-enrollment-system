'use client';

import { 
  Monitor, Database, Shield, Zap, 
  Cpu, Server, Globe, Code2,
  Terminal, Wifi, Lock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

const FiberOpticLines = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id="fiber-blue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(59, 130, 246, 0)" />
            <stop offset="50%" stopColor="rgba(59, 130, 246, 0.6)" />
            <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
          </linearGradient>
          <linearGradient id="fiber-orange" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(249, 115, 22, 0)" />
            <stop offset="50%" stopColor="rgba(249, 115, 22, 0.6)" />
            <stop offset="100%" stopColor="rgba(249, 115, 22, 0)" />
          </linearGradient>
        </defs>
        
        {/* Curved Fiber Lines */}
        {Array.from({ length: 12 }).map((_, i) => {
          const yStart = 5 + i * 8;
          const yEnd = 15 + i * 7;
          const controlY = 50 + (i % 2 === 0 ? 30 : -30);
          
          return (
            <g key={i}>
              {/* Base Line */}
              <path
                d={`M -20 ${yStart} Q 50 ${controlY} 120 ${yEnd}`}
                fill="none"
                stroke="rgba(255,255,255,0.03)"
                strokeWidth="0.1"
              />
              {/* Moving Pulse */}
              <motion.path
                d={`M -20 ${yStart} Q 50 ${controlY} 120 ${yEnd}`}
                fill="none"
                stroke={i % 2 === 0 ? "url(#fiber-blue)" : "url(#fiber-orange)"}
                strokeWidth="0.3"
                strokeLinecap="round"
                initial={{ pathLength: 0.3, pathOffset: 0, opacity: 0 }}
                animate={{ 
                  pathOffset: [0, 1],
                  opacity: [0, 0.5, 0.5, 0]
                }}
                transition={{ 
                  duration: 5 + i * 0.8, 
                  repeat: Infinity, 
                  ease: "linear",
                  delay: i * 0.2
                }}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const HollowOctagons = () => {
  // Octagon points: 30,0 70,0 100,30 100,70 70,100 30,100 0,70 0,30
  const octagons = [
    { size: 300, x: '10%', y: '20%', color: 'stroke-blue-500/20', duration: 40 },
    { size: 500, x: '80%', y: '60%', color: 'stroke-orange-500/20', duration: 50 },
    { size: 200, x: '50%', y: '50%', color: 'stroke-white/10', duration: 30 },
    { size: 400, x: '-10%', y: '80%', color: 'stroke-blue-400/10', duration: 45 },
    { size: 350, x: '90%', y: '10%', color: 'stroke-orange-400/10', duration: 35 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {octagons.map((oct, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: oct.x,
            top: oct.y,
            width: oct.size,
            height: oct.size,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: oct.duration, repeat: Infinity, ease: "linear" }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
            <polygon 
              points="30,0 70,0 100,30 100,70 70,100 30,100 0,70 0,30" 
              fill="none" 
              className={oct.color} 
              strokeWidth="1"
            />
          </svg>
        </motion.div>
      ))}
    </div>
  );
};

const FloatingTechIcons = () => {
  const icons = [
    { Icon: Code2, color: "text-blue-500" },
    { Icon: Terminal, color: "text-orange-500" },
    { Icon: Cpu, color: "text-blue-400" },
    { Icon: Database, color: "text-orange-400" },
    { Icon: Globe, color: "text-white" },
    { Icon: Zap, color: "text-blue-300" },
    { Icon: Wifi, color: "text-orange-300" },
    { Icon: Lock, color: "text-slate-400" },
    { Icon: Monitor, color: "text-blue-600" },
    { Icon: Server, color: "text-orange-600" },
  ];

  const [items, setItems] = useState<{Icon: any, color: string, x: number, y: number, size: number, duration: number}[]>([]);

  useEffect(() => {
    setItems(Array.from({ length: 15 }).map(() => ({
      ...icons[Math.floor(Math.random() * icons.length)],
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 20 + 20,
      duration: Math.random() * 20 + 10,
    })));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {items.map((item, i) => (
        <motion.div
          key={i}
          className={cn("absolute opacity-20", item.color)}
          style={{
            left: `${item.x}%`,
            top: `${item.y}%`,
          }}
          animate={{
            y: [0, -100, 0],
            x: [0, 50, 0],
            rotate: [0, 360],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: item.duration,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <item.Icon size={item.size} />
        </motion.div>
      ))}
    </div>
  );
};

const MovingCircuits = () => {
   return (
     <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
       <svg className="w-full h-full">
         <defs>
           <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
             <stop offset="0%" stopColor="rgba(59, 130, 246, 0)" />
             <stop offset="50%" stopColor="rgba(59, 130, 246, 0.5)" />
             <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
           </linearGradient>
         </defs>
         
         {/* Circuit Path 1 - Blue */}
         <motion.path
            d="M0 100 H 200 V 300 H 500"
            fill="none"
            stroke="url(#grad1)"
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
         />
         
         {/* Circuit Path 2 - Orange */}
         <motion.path
            d="M1000 0 V 200 H 800 V 500"
            fill="none"
            stroke="rgba(249, 115, 22, 0.4)" 
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: 1 }}
         />
         
         {/* Circuit Path 3 - White */}
         <motion.path
            d="M0 800 H 300 V 600 H 600"
            fill="none"
            stroke="rgba(255, 255, 255, 0.3)" 
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear", delay: 2 }}
         />
         
         {/* Circuit Path 4 - Blue */}
         <motion.path
            d="M800 800 V 600 H 1000"
            fill="none"
            stroke="rgba(59, 130, 246, 0.4)" 
            strokeWidth="2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "linear", delay: 0.5 }}
         />
       </svg>
     </div>
   )
}

export const BSITBackground = () => {
  return (
    <>
      <div className="fixed inset-0 bg-[#020617] -z-50" />
      <FiberOpticLines />
      <HollowOctagons />
      <FloatingTechIcons />
      {/* Deep Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_100%)] pointer-events-none" />
    </>
  );
};
