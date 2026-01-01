import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

export type NavSection = "wheel" | "flight" | "promptor" | "agents" | "breaker" | "assembly" | "diff" | "packs" | "session" | "monitor";

export interface TourStep {
  id: string;
  title: string;
  description: string;
  targetSelector?: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
  action?: "click" | "hover" | "none";
  highlightPadding?: number;
  navSection?: NavSection;
}

interface OnboardingContextType {
  isActive: boolean;
  currentStep: number;
  steps: TourStep[];
  startTour: () => void;
  endTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  skipTour: () => void;
  hasCompletedTour: boolean;
  resetTour: () => void;
  onSectionChange?: (section: NavSection) => void;
  setOnSectionChange: (callback: ((section: NavSection) => void) | undefined) => void;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

const TOUR_STORAGE_KEY = "coding-wheel-tour-completed";

// Define the tour steps
const tourSteps: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Agents by Valentine RF! 🎮",
    description: "Your next-gen autonomous coding command center. Let's take a quick tour of the key features that will supercharge your development workflow.",
    position: "center",
  },
  {
    id: "model-wheel",
    title: "The Model Wheel 🎡",
    description: "Select your AI model here. Choose between Codex, Claude, Gemini, or Manus. Each model has different strengths - click to spin or select directly!",
    targetSelector: "[data-tour='model-wheel']",
    position: "right",
    highlightPadding: 20,
    navSection: "wheel",
  },
  {
    id: "flight-computer",
    title: "RALPH Loop+ Flight Computer 🚀",
    description: "This is your mission control. Monitor completion progress, circuit breaker status, and iteration count. The flight computer keeps your autonomous loops on track.",
    targetSelector: "[data-tour='flight-computer']",
    position: "left",
    highlightPadding: 15,
    navSection: "flight",
  },
  {
    id: "completion-meter",
    title: "Completion Promise Meter 📊",
    description: "Track your progress toward the goal. As completion criteria are met, this meter fills up. When it hits 100%, your loop is complete!",
    targetSelector: "[data-tour='completion-meter']",
    position: "bottom",
    highlightPadding: 10,
    navSection: "flight",
  },
  {
    id: "circuit-breaker",
    title: "Circuit Breaker Status 🔌",
    description: "Safety first! The circuit breaker monitors for stuck loops. CLOSED = running normally, HALF_OPEN = testing recovery, OPEN = stopped to prevent waste.",
    targetSelector: "[data-tour='circuit-breaker']",
    position: "bottom",
    highlightPadding: 10,
    navSection: "flight",
  },
  {
    id: "power-promptor",
    title: "Power Promptor ⚡",
    description: "Craft perfect prompts with our 4-field system: Goal (what to build), Context (background info), Done When (success criteria), and Do Not (constraints). Voice input supported!",
    targetSelector: "[data-tour='power-promptor']",
    position: "right",
    highlightPadding: 15,
    navSection: "promptor",
  },
  {
    id: "agent-profiles",
    title: "Agent Profiles 🤖",
    description: "Choose your coding personality: Patch Goblin (fast fixes), Architect Owl (design focus), Test Gremlin (test-first), or Refactor Surgeon (clean code). Each optimizes for different tasks.",
    targetSelector: "[data-tour='agent-profiles']",
    position: "left",
    highlightPadding: 15,
    navSection: "agents",
  },
  {
    id: "session-manager",
    title: "Session Manager 🎛️",
    description: "Control your RALPH loop here. Toggle between Manual and Autonomous modes, set max iterations, and manage your completion promise checklist.",
    targetSelector: "[data-tour='session-manager']",
    position: "left",
    highlightPadding: 15,
    navSection: "session",
  },
  {
    id: "start-loop",
    title: "Start Your Loop! ▶️",
    description: "When you're ready, hit 'Start Loop' to begin. The AI will work autonomously until your completion criteria are met or the circuit breaker trips.",
    targetSelector: "[data-tour='start-loop']",
    position: "top",
    highlightPadding: 10,
    navSection: "flight",
  },
  {
    id: "sidebar-nav",
    title: "Quick Navigation 📍",
    description: "Use the sidebar to access Analytics, Session History, Prompt Templates, Multi-Session view, and Settings. Everything you need is one click away!",
    targetSelector: "[data-tour='sidebar-nav']",
    position: "right",
    highlightPadding: 10,
  },
  {
    id: "complete",
    title: "You're Ready! 🎉",
    description: "That's the basics! Explore the dashboard, save your favorite configurations as templates, and let the AI handle the heavy lifting. Happy coding!",
    position: "center",
  },
];

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [hasCompletedTour, setHasCompletedTour] = useState(true);
  const [onSectionChange, setOnSectionChangeState] = useState<((section: NavSection) => void) | undefined>(undefined);

  // Check if user has completed tour on mount
  useEffect(() => {
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    setHasCompletedTour(completed === "true");
  }, []);

  // Navigate to the correct section when step changes
  useEffect(() => {
    if (isActive && onSectionChange) {
      const step = tourSteps[currentStep];
      if (step?.navSection) {
        onSectionChange(step.navSection);
      }
    }
  }, [isActive, currentStep, onSectionChange]);

  const setOnSectionChange = useCallback((callback: ((section: NavSection) => void) | undefined) => {
    setOnSectionChangeState(() => callback);
  }, []);

  const startTour = useCallback(() => {
    setCurrentStep(0);
    setIsActive(true);
  }, []);

  const endTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    setHasCompletedTour(true);
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
  }, []);

  const skipTour = useCallback(() => {
    setIsActive(false);
    setCurrentStep(0);
    setHasCompletedTour(true);
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      endTour();
    }
  }, [currentStep, endTour]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < tourSteps.length) {
      setCurrentStep(step);
    }
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    setHasCompletedTour(false);
  }, []);

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentStep,
        steps: tourSteps,
        startTour,
        endTour,
        nextStep,
        prevStep,
        goToStep,
        skipTour,
        hasCompletedTour,
        resetTour,
        onSectionChange,
        setOnSectionChange,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
