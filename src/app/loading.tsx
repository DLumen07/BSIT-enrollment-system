
'use client';

import { BSITBackground } from '@/components/bsit-background';
import { motion } from 'framer-motion';
import { FileCheck, User } from 'lucide-react';

export default function Loading({ message = "PROCESSING..." }: { message?: string }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center font-sans bg-[#0B1121] text-white">
      {/* Subtle Background */}
      <div className="absolute inset-0 opacity-20">
        <BSITBackground />
      </div>

      <div className="relative z-10 flex flex-col items-center gap-6">
        
        {/* Scanner Frame */}
        <div className="relative w-20 h-20">
            {/* Corner Brackets */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-blue-500 rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-blue-500 rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-orange-500 rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-orange-500 rounded-br-lg" />

            {/* Scanning Area */}
            <div className="absolute inset-2 bg-blue-500/5 rounded-md overflow-hidden flex items-center justify-center border border-white/5">
                
                {/* Icons Layered */}
                <div className="relative z-10 w-8 h-8">
                    {/* User Icon - Visible initially, fades out during scan */}
                    <motion.div 
                        className="absolute inset-0 flex items-center justify-center text-slate-500"
                        animate={{ opacity: [1, 0, 0, 1] }}
                        transition={{ 
                            duration: 3, 
                            times: [0, 0.3, 0.85, 1], // Fade out as scan passes
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    >
                        <User className="w-8 h-8" />
                    </motion.div>

                    {/* FileCheck Icon - Invisible initially, fades in during scan */}
                    <motion.div 
                        className="absolute inset-0 flex items-center justify-center text-blue-400"
                        animate={{ opacity: [0, 1, 1, 0] }}
                        transition={{ 
                            duration: 3, 
                            times: [0, 0.3, 0.85, 1], // Fade in as scan passes
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    >
                        <FileCheck className="w-8 h-8" />
                    </motion.div>
                </div>

                {/* Laser Scan Line */}
                <motion.div
                    className="absolute left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-orange-500 to-transparent shadow-[0_0_10px_#f97316]"
                    animate={{ top: ["-10%", "110%", "110%", "-10%"] }}
                    transition={{ 
                        duration: 3, 
                        times: [0, 0.3, 0.85, 1], // Sync with opacity change
                        repeat: Infinity, 
                        ease: "linear" 
                    }}
                />
                
                {/* Scan Grid Background */}
                <div className="absolute inset-0 bg-[linear-gradient(transparent_2px,_#000_2px)] bg-[size:100%_4px] opacity-20" />
            </div>
        </div>

        {/* Status Text */}
        <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] font-mono text-blue-200 tracking-widest uppercase">{message}</span>
            </div>
        </div>
      </div>
    </div>
  );
}
