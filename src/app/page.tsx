'use client';

import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Monitor, Database, Shield, Globe, Code2, Copyright, ArrowRight
} from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { motion, useMotionValue, useMotionTemplate } from 'framer-motion';
import { BSITBackground } from '@/components/bsit-background';
import { TypingText } from '@/components/ui/typing-text';

export default function Home() {
  const schoolLogo = PlaceHolderImages.find(p => p.id === 'school-logo');

  // 3D Tilt Logic
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = ({ currentTarget, clientX, clientY }: React.MouseEvent) => {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center font-sans selection:bg-orange-500/30">
      
      {/* --- BSIT Tech Background --- */}
      <BSITBackground />

      <main className="container relative z-10 px-4 flex flex-col items-center justify-center py-10">
        
        {/* --- Compact Card --- */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative group perspective-[1000px] w-full max-w-[500px]"
          onMouseMove={handleMouseMove}
        >
          {/* Gradient Border */}
          <div className="absolute -inset-0.5 bg-gradient-to-br from-blue-500 via-orange-500 to-blue-600 rounded-[2rem] blur opacity-30 group-hover:opacity-60 transition duration-500" />
          
          <div className="relative w-full bg-[#0B1121]/90 backdrop-blur-xl rounded-[2rem] overflow-hidden border border-white/10 shadow-2xl">
            
            {/* Spotlight */}
            <motion.div
              className="pointer-events-none absolute -inset-px rounded-[2rem] opacity-0 transition duration-500 group-hover:opacity-100"
              style={{
                background: useMotionTemplate`
                  radial-gradient(
                    500px circle at ${mouseX}px ${mouseY}px,
                    rgba(255,255,255,0.06),
                    transparent 80%
                  )
                `,
              }}
            />

            <div className="flex flex-col items-center p-8 md:p-10 text-center relative z-10">
              
              {/* --- Logo (Floating) --- */}
              <div className="relative mb-8 group-hover:scale-105 transition-transform duration-300">
                {schoolLogo && (
                  <Image
                    src={schoolLogo.imageUrl}
                    alt="School Logo"
                    width={90}
                    height={90}
                    className="relative z-10 drop-shadow-2xl"
                    priority
                  />
                )}
              </div>

              {/* --- Header Text --- */}
              <div className="space-y-3 mb-8 w-full">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                  <Globe className="w-3 h-3" />
                  <span>Global Access</span>
                </div>
                
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">
                  BSIT <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-orange-600">Enrollment</span>
                </h1>
                
                <div className="text-slate-400 text-sm font-medium max-w-xs mx-auto h-6 flex items-center justify-center">
                  <TypingText messages={[
                    "College of Information Technology.",
                    "Disciplined, Innovative & Talented.",
                    "Shaping Future Innovators.",
                    "Excellence in Computing.",
                    "Building the Digital Future."
                  ]} />
                </div>
              </div>

              {/* --- Buttons (Side-by-Side) --- */}
              <div className="w-full grid grid-cols-2 gap-4">
                <Link href="/student-login" className="w-full">
                  <Button className="group relative w-full h-12 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 border border-blue-400/20 transition-all hover:scale-[1.02] overflow-hidden">
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="relative flex items-center justify-center gap-2">
                      <Monitor className="w-4 h-4" />
                      <span>Student</span>
                      <ArrowRight className="w-3 h-3 opacity-50 -ml-1 group-hover:translate-x-1 group-hover:opacity-100 transition-all" />
                    </div>
                  </Button>
                </Link>

                <Link href="/admin-login" className="w-full">
                  <Button variant="outline" className="group w-full h-12 border-white/10 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white font-semibold rounded-xl transition-all hover:scale-[1.02] hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-900/10">
                    <div className="flex items-center justify-center gap-2">
                      <Database className="w-4 h-4 group-hover:text-orange-400 transition-colors" />
                      <span>Admin</span>
                    </div>
                  </Button>
                </Link>
              </div>

            </div>
          </div>
        </motion.div>

        {/* --- Footer --- */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 flex items-center gap-6 text-[10px] font-medium text-slate-600 uppercase tracking-wider"
        >
          <div className="flex items-center gap-2">
            <Copyright className="w-3 h-3" />
            <span>DarenDL7</span>
          </div>
          <div className="w-px h-3 bg-slate-800" />
          <div className="flex items-center gap-2">
            <span>All Rights Reserved</span>
          </div>
        </motion.div>

      </main>
    </div>
  );
}
