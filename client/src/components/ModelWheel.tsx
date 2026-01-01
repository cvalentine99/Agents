import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Brain, Sparkles, Bot } from "lucide-react";

export type ModelType = "codex" | "claude" | "gemini" | "manus";

interface Model {
  id: ModelType;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  glowColor: string;
}

const models: Model[] = [
  {
    id: "codex",
    name: "Codex",
    description: "Fast diffs & patches",
    icon: <Zap className="w-8 h-8" />,
    color: "oklch(0.75 0.18 195)",
    glowColor: "oklch(0.80 0.22 195)",
  },
  {
    id: "claude",
    name: "Claude",
    description: "Deep reasoning",
    icon: <Brain className="w-8 h-8" />,
    color: "oklch(0.65 0.30 330)",
    glowColor: "oklch(0.75 0.30 350)",
  },
  {
    id: "gemini",
    name: "Gemini",
    description: "Analysis & planning",
    icon: <Sparkles className="w-8 h-8" />,
    color: "oklch(0.60 0.35 290)",
    glowColor: "oklch(0.70 0.35 290)",
  },
  {
    id: "manus",
    name: "Manus",
    description: "Full autonomy",
    icon: <Bot className="w-8 h-8" />,
    color: "oklch(0.85 0.20 85)",
    glowColor: "oklch(0.90 0.22 85)",
  },
];

interface ModelWheelProps {
  selectedModel: ModelType;
  onSelectModel: (model: ModelType) => void;
  disabled?: boolean;
}

export function ModelWheel({ selectedModel, onSelectModel, disabled }: ModelWheelProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [hoveredModel, setHoveredModel] = useState<ModelType | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  const segmentAngle = 360 / models.length;

  const spinWheel = () => {
    if (isSpinning || disabled) return;
    
    setIsSpinning(true);
    
    // Random number of full rotations (3-5) plus random segment
    const fullRotations = 3 + Math.floor(Math.random() * 3);
    const randomSegment = Math.floor(Math.random() * models.length);
    const targetRotation = rotation + (fullRotations * 360) + (randomSegment * segmentAngle);
    
    setRotation(targetRotation);
    
    // Calculate which model will be selected
    const normalizedRotation = targetRotation % 360;
    const selectedIndex = Math.floor(normalizedRotation / segmentAngle) % models.length;
    const invertedIndex = (models.length - selectedIndex) % models.length;
    
    setTimeout(() => {
      setIsSpinning(false);
      onSelectModel(models[invertedIndex].id);
    }, 3000);
  };

  const selectModelDirectly = (model: ModelType) => {
    if (isSpinning || disabled) return;
    onSelectModel(model);
    
    // Rotate to show selected model at top
    const modelIndex = models.findIndex(m => m.id === model);
    const targetRotation = modelIndex * segmentAngle;
    setRotation(targetRotation);
  };

  const selectedModelData = models.find(m => m.id === selectedModel);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Wheel Container */}
      <div className="relative w-80 h-80">
        {/* Outer Ring Glow */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, ${models.map((m, i) => `${m.color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`).join(", ")})`,
            filter: "blur(20px)",
            opacity: 0.5,
          }}
        />
        
        {/* Main Wheel */}
        <motion.div
          ref={wheelRef}
          className="absolute inset-4 rounded-full cyber-border overflow-hidden"
          style={{
            background: "var(--bg-deep)",
          }}
          animate={{ rotate: rotation }}
          transition={{
            duration: isSpinning ? 3 : 0.5,
            ease: isSpinning ? [0.17, 0.67, 0.12, 0.99] : "easeOut",
          }}
        >
          {/* Segments */}
          {models.map((model, index) => {
            const angle = index * segmentAngle;
            const isSelected = model.id === selectedModel;
            const isHovered = model.id === hoveredModel;
            
            return (
              <motion.div
                key={model.id}
                className="absolute inset-0 flex items-center justify-center cursor-pointer"
                style={{
                  transform: `rotate(${angle}deg)`,
                  transformOrigin: "center",
                }}
                onClick={() => selectModelDirectly(model.id)}
                onMouseEnter={() => setHoveredModel(model.id)}
                onMouseLeave={() => setHoveredModel(null)}
              >
                <div
                  className="absolute w-full h-full"
                  style={{
                    clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.tan(Math.PI / models.length)}% 0%, 50% 50%)`,
                    background: isSelected || isHovered 
                      ? `linear-gradient(to top, ${model.color}40, ${model.color}20)`
                      : "transparent",
                    borderRight: `1px solid ${model.color}40`,
                  }}
                />
                <div
                  className="absolute flex flex-col items-center gap-1 transition-all duration-200"
                  style={{
                    transform: `translateY(-60px) rotate(${-rotation}deg)`,
                    color: isSelected ? model.color : "var(--text-secondary)",
                    textShadow: isSelected ? `0 0 10px ${model.glowColor}` : "none",
                  }}
                >
                  <div style={{ color: model.color }}>{model.icon}</div>
                  <span className="font-cyber text-xs font-bold">{model.name}</span>
                </div>
              </motion.div>
            );
          })}
          
          {/* Center Hub */}
          <div className="absolute inset-[35%] rounded-full bg-[var(--bg-void)] cyber-border flex items-center justify-center">
            <motion.button
              className="w-full h-full rounded-full flex items-center justify-center font-cyber text-sm font-bold uppercase tracking-wider"
              style={{
                background: `radial-gradient(circle, ${selectedModelData?.color}30 0%, transparent 70%)`,
                color: selectedModelData?.color,
                textShadow: `0 0 10px ${selectedModelData?.glowColor}`,
              }}
              onClick={spinWheel}
              disabled={isSpinning || disabled}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isSpinning ? "..." : "SPIN"}
            </motion.button>
          </div>
        </motion.div>
        
        {/* Selection Indicator (Arrow at top) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
          <div 
            className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent"
            style={{ 
              borderTopColor: selectedModelData?.color,
              filter: `drop-shadow(0 0 10px ${selectedModelData?.glowColor})`,
            }}
          />
        </div>
      </div>
      
      {/* Selected Model Info */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedModel}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-center"
        >
          <h3 
            className="font-cyber text-2xl font-bold mb-1"
            style={{ 
              color: selectedModelData?.color,
              textShadow: `0 0 20px ${selectedModelData?.glowColor}`,
            }}
          >
            {selectedModelData?.name}
          </h3>
          <p className="text-[var(--text-muted)] text-sm">
            {selectedModelData?.description}
          </p>
        </motion.div>
      </AnimatePresence>
      
      {/* Quick Select Buttons */}
      <div className="flex gap-2">
        {models.map((model) => (
          <motion.button
            key={model.id}
            className={`px-3 py-1.5 text-xs font-cyber font-bold uppercase tracking-wider rounded transition-all ${
              selectedModel === model.id 
                ? "" 
                : "opacity-60 hover:opacity-100"
            }`}
            style={{
              background: selectedModel === model.id ? `${model.color}30` : "var(--bg-surface)",
              border: `1px solid ${model.color}`,
              color: model.color,
              boxShadow: selectedModel === model.id ? `0 0 5px ${model.color}, 0 0 10px ${model.color}, 0 0 20px ${model.color}50` : "none",
            }}
            onClick={() => selectModelDirectly(model.id)}
            disabled={isSpinning || disabled}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {model.name}
          </motion.button>
        ))}
      </div>
    </div>
  );
}
