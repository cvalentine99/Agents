import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import SessionHistory from "./pages/SessionHistory";
import Analytics from "./pages/Analytics";
import PromptTemplates from "./pages/PromptTemplates";
import MultiSession from "./pages/MultiSession";
import SessionTemplatesPage from "./pages/SessionTemplatesPage";
import DeepResearch from "./pages/DeepResearch";
import PublicResearch from "./pages/PublicResearch";
import KnowledgeBase from "./pages/KnowledgeBase";
import NotFound from "./pages/NotFound";
import RagChatWidget from "./components/RagChatWidget";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/settings" component={Settings} />
      <Route path="/history" component={SessionHistory} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/templates" component={PromptTemplates} />
      <Route path="/multi" component={MultiSession} />
      <Route path="/session-templates" component={SessionTemplatesPage} />
      <Route path="/research" component={DeepResearch} />
      <Route path="/research/share/:shareToken" component={PublicResearch} />
      <Route path="/knowledge" component={KnowledgeBase} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster 
            position="bottom-right"
            toastOptions={{
              style: {
                background: "var(--bg-surface)",
                border: "1px solid var(--cyber-purple)",
                color: "var(--text-primary)",
              },
            }}
          />
          <Router />
          <RagChatWidget />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
