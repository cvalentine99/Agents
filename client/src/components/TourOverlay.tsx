import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useOnboarding, TourStep } from "@/contexts/OnboardingContext";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, SkipForward, RotateCcw } from "lucide-react";

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TourOverlay() {
  const {
    isActive,
    currentStep,
    steps,
    nextStep,
    prevStep,
    skipTour,
    endTour,
  } = useOnboarding();

  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;
  const isCenterStep = step?.position === "center" || !step?.targetSelector;

  // Calculate highlight position when step changes
  useEffect(() => {
    if (!isActive || !step) return;

    const updatePositions = () => {
      if (step.targetSelector) {
        const element = document.querySelector(step.targetSelector);
        if (element) {
          const rect = element.getBoundingClientRect();
          const padding = step.highlightPadding || 10;
          
          setHighlightRect({
            top: rect.top - padding + window.scrollY,
            left: rect.left - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
          });

          // Calculate tooltip position based on step.position
          const tooltipWidth = 380;
          const tooltipHeight = 200;
          const gap = 20;
          
          let tooltipTop = 0;
          let tooltipLeft = 0;

          switch (step.position) {
            case "top":
              tooltipTop = rect.top - tooltipHeight - gap + window.scrollY;
              tooltipLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
              break;
            case "bottom":
              tooltipTop = rect.bottom + gap + window.scrollY;
              tooltipLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
              break;
            case "left":
              tooltipTop = rect.top + rect.height / 2 - tooltipHeight / 2 + window.scrollY;
              tooltipLeft = rect.left - tooltipWidth - gap;
              break;
            case "right":
              tooltipTop = rect.top + rect.height / 2 - tooltipHeight / 2 + window.scrollY;
              tooltipLeft = rect.right + gap;
              break;
            default:
              tooltipTop = rect.bottom + gap + window.scrollY;
              tooltipLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
          }

          // Keep tooltip within viewport
          tooltipLeft = Math.max(20, Math.min(tooltipLeft, window.innerWidth - tooltipWidth - 20));
          tooltipTop = Math.max(20, tooltipTop);

          setTooltipPosition({ top: tooltipTop, left: tooltipLeft });

          // Scroll element into view if needed
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      } else {
        // Center position (no target element)
        setHighlightRect(null);
        setTooltipPosition({
          top: window.innerHeight / 2 - 150,
          left: window.innerWidth / 2 - 190,
        });
      }
    };

    updatePositions();
    
    // Update on resize
    window.addEventListener("resize", updatePositions);
    return () => window.removeEventListener("resize", updatePositions);
  }, [isActive, currentStep, step]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        skipTour();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        nextStep();
      } else if (e.key === "ArrowLeft") {
        prevStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, nextStep, prevStep, skipTour]);

  if (!isActive || !step) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[9999] pointer-events-none">
        {/* Dark overlay with cutout */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 pointer-events-auto"
          onClick={skipTour}
        >
          <svg className="w-full h-full">
            <defs>
              <mask id="tour-mask">
                <rect x="0" y="0" width="100%" height="100%" fill="white" />
                {highlightRect && (
                  <motion.rect
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    x={highlightRect.left}
                    y={highlightRect.top}
                    width={highlightRect.width}
                    height={highlightRect.height}
                    rx="12"
                    fill="black"
                  />
                )}
              </mask>
            </defs>
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="rgba(0, 0, 0, 0.85)"
              mask="url(#tour-mask)"
            />
          </svg>
        </motion.div>

        {/* Highlight border glow */}
        {highlightRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute rounded-xl pointer-events-none"
            style={{
              top: highlightRect.top,
              left: highlightRect.left,
              width: highlightRect.width,
              height: highlightRect.height,
              boxShadow: "0 0 0 3px #a855f7, 0 0 30px #a855f7, 0 0 60px rgba(168, 85, 247, 0.5)",
            }}
          />
        )}

        {/* Tooltip */}
        <motion.div
          ref={tooltipRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ delay: 0.1 }}
          className="absolute pointer-events-auto"
          style={{
            top: isCenterStep ? "50%" : tooltipPosition.top,
            left: isCenterStep ? "50%" : tooltipPosition.left,
            transform: isCenterStep ? "translate(-50%, -50%)" : "none",
            width: isCenterStep ? "420px" : "380px",
          }}
        >
          <div className="bg-gray-900/95 backdrop-blur-xl border border-purple-500/50 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header with close button */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-purple-500/30 bg-purple-500/10">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                <span className="text-xs font-mono text-purple-400">
                  Step {currentStep + 1} of {steps.length}
                </span>
              </div>
              <button
                onClick={skipTour}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5">
              <h3 className="text-xl font-bold text-white mb-3 font-['Orbitron']">
                {step.title}
              </h3>
              <p className="text-gray-300 text-sm leading-relaxed mb-5">
                {step.description}
              </p>

              {/* Progress dots */}
              <div className="flex items-center justify-center gap-1.5 mb-5">
                {steps.map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                      index === currentStep
                        ? "bg-purple-500 w-6"
                        : index < currentStep
                        ? "bg-purple-500/50"
                        : "bg-gray-600"
                    }`}
                  />
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={skipTour}
                  className="text-gray-400 hover:text-white"
                >
                  <SkipForward className="w-4 h-4 mr-1" />
                  Skip Tour
                </Button>

                <div className="flex items-center gap-2">
                  {!isFirstStep && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={prevStep}
                      className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" />
                      Back
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={isLastStep ? endTour : nextStep}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
                  >
                    {isLastStep ? (
                      <>
                        Get Started
                        <RotateCcw className="w-4 h-4 ml-1" />
                      </>
                    ) : (
                      <>
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Keyboard hints */}
            <div className="px-5 py-2 bg-gray-800/50 border-t border-gray-700/50 flex items-center justify-center gap-4 text-xs text-gray-500">
              <span>
                <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">←</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-400 ml-1">→</kbd>
                {" "}Navigate
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">Enter</kbd>
                {" "}Next
              </span>
              <span>
                <kbd className="px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">Esc</kbd>
                {" "}Skip
              </span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
