import { useEffect } from "react";
import { useOnboarding } from "@/contexts/OnboardingContext";
import { Button } from "@/components/ui/button";
import { HelpCircle, Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TourTriggerProps {
  autoStart?: boolean;
  variant?: "button" | "icon" | "banner";
}

export function TourTrigger({ autoStart = false, variant = "icon" }: TourTriggerProps) {
  const { startTour, hasCompletedTour, isActive } = useOnboarding();

  // Auto-start tour for first-time users
  useEffect(() => {
    if (autoStart && !hasCompletedTour && !isActive) {
      // Small delay to let the page render first
      const timer = setTimeout(() => {
        startTour();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [autoStart, hasCompletedTour, isActive, startTour]);

  if (isActive) return null;

  if (variant === "banner" && !hasCompletedTour) {
    return (
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">New to Agents by Valentine RF?</h3>
              <p className="text-gray-400 text-sm">Take a quick tour to learn the basics</p>
            </div>
          </div>
          <Button
            onClick={startTour}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Start Tour
          </Button>
        </div>
      </div>
    );
  }

  if (variant === "button") {
    return (
      <Button
        onClick={startTour}
        variant="outline"
        size="sm"
        className="border-purple-500/50 text-purple-400 hover:bg-purple-500/20"
      >
        <HelpCircle className="w-4 h-4 mr-2" />
        Take Tour
      </Button>
    );
  }

  // Default: icon variant
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={startTour}
          className="w-8 h-8 rounded-full bg-purple-500/20 hover:bg-purple-500/30 flex items-center justify-center text-purple-400 hover:text-purple-300 transition-all"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>Take a guided tour</p>
      </TooltipContent>
    </Tooltip>
  );
}
