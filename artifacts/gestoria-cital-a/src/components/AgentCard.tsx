import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface AgentCardProps {
  name: string;
  role: string;
  imagePath: string;
  isOnline?: boolean;
  className?: string;
  delay?: number;
}

export function AgentCard({ name, role, imagePath, isOnline = true, className, delay = 0 }: AgentCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "group relative rounded-2xl overflow-hidden glass-panel p-1 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/90 z-10"></div>
      
      <img 
        src={imagePath} 
        alt={name}
        className="w-full h-[280px] sm:h-[320px] object-cover rounded-xl transition-transform duration-700 group-hover:scale-105"
        onError={(e) => {
          (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${name}&background=1F1A38&color=00F0FF&size=512`;
        }}
      />
      
      <div className="absolute bottom-0 left-0 right-0 p-5 z-20 flex flex-col items-center text-center">
        <h3 className="font-display font-bold text-xl text-white mb-1">{name}</h3>
        <p className="text-sm text-muted-foreground mb-3">{role}</p>
        
        {isOnline && (
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 border border-white/10 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse shadow-[0_0_8px_hsl(var(--accent))]"></span>
            <span className="text-xs font-medium text-white/90">En línea</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
