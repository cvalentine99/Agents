/**
 * AutoSignSuggestions Component
 * 
 * Displays auto-suggested signs based on failure patterns detected during
 * RALPH Loop execution. Users can accept (add to PROMPT.md) or dismiss suggestions.
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle,
  X,
  Lightbulb,
  Sparkles,
  TrendingUp,
  Zap,
  RefreshCw,
} from "lucide-react";

interface SignSuggestion {
  sign: string;
  pattern: string;
  confidence: number;
  reason: string;
  severity: "low" | "medium" | "high" | "critical";
}

interface AutoSignSuggestionsProps {
  sessionId: number;
  projectPath: string;
  onSignAdded?: () => void;
}

export function AutoSignSuggestions({
  sessionId,
  projectPath,
  onSignAdded,
}: AutoSignSuggestionsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [generatingCustom, setGeneratingCustom] = useState(false);

  // Fetch suggestions
  const { data: suggestions, refetch: refetchSuggestions } =
    trpc.autoSign.getSuggestions.useQuery(
      { sessionId },
      { refetchInterval: 5000 } // Poll every 5 seconds
    );

  // Fetch failure stats
  const { data: stats } = trpc.autoSign.getStats.useQuery(
    { sessionId },
    { refetchInterval: 5000 }
  );

  // Mutations
  const dismissMutation = trpc.autoSign.dismissSuggestion.useMutation();
  const addSignMutation = trpc.promptMd.addSign.useMutation();
  const generateCustomMutation = trpc.autoSign.generateCustomSign.useMutation();

  const handleAcceptSuggestion = async (suggestion: SignSuggestion) => {
    try {
      await addSignMutation.mutateAsync({
        projectPath,
        signText: suggestion.sign,
        failurePattern: suggestion.pattern,
      });
      
      // Dismiss after adding
      await dismissMutation.mutateAsync({
        sessionId,
        pattern: suggestion.pattern,
        sign: suggestion.sign,
      });

      toast.success("Sign added to PROMPT.md", {
        description: "The AI will now follow this guidance",
      });

      refetchSuggestions();
      onSignAdded?.();
    } catch (error) {
      toast.error("Failed to add sign");
    }
  };

  const handleDismissSuggestion = async (suggestion: SignSuggestion) => {
    try {
      await dismissMutation.mutateAsync({
        sessionId,
        pattern: suggestion.pattern,
        sign: suggestion.sign,
      });
      refetchSuggestions();
    } catch (error) {
      toast.error("Failed to dismiss suggestion");
    }
  };

  const handleGenerateCustomSign = async () => {
    if (!stats?.lastFailure) {
      toast.error("No recent failure to analyze");
      return;
    }

    setGeneratingCustom(true);
    try {
      const result = await generateCustomMutation.mutateAsync({
        errorOutput: stats.lastFailure.errorOutput,
      });

      if (result.sign) {
        await addSignMutation.mutateAsync({
          projectPath,
          signText: result.sign,
          failurePattern: stats.lastFailure.pattern,
        });

        toast.success("Custom sign generated and added", {
          description: result.sign,
        });

        onSignAdded?.();
      } else {
        toast.error("Could not generate a sign for this error");
      }
    } catch (error) {
      toast.error("Failed to generate custom sign");
    } finally {
      setGeneratingCustom(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/50";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      default:
        return "bg-blue-500/20 text-blue-400 border-blue-500/50";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical":
        return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case "high":
        return <Zap className="h-4 w-4 text-orange-400" />;
      case "medium":
        return <TrendingUp className="h-4 w-4 text-yellow-400" />;
      default:
        return <Lightbulb className="h-4 w-4 text-blue-400" />;
    }
  };

  // Don't render if no suggestions and no failures
  if (!suggestions?.length && !stats?.consecutiveFailures) {
    return null;
  }

  return (
    <Card className="border-purple-500/30 bg-slate-900/50 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-purple-300">
            <Sparkles className="h-4 w-4 text-purple-400" />
            Auto-Sign Suggestions
            {suggestions && suggestions.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-purple-500/20 text-purple-300">
                {suggestions.length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchSuggestions()}
              className="h-7 px-2 text-slate-400 hover:text-white"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 px-2 text-slate-400 hover:text-white"
            >
              {isExpanded ? "Collapse" : "Expand"}
            </Button>
          </div>
        </div>

        {/* Failure Stats Banner */}
        {stats && stats.consecutiveFailures > 0 && (
          <div className="mt-2 flex items-center gap-2 rounded-md bg-red-500/10 px-3 py-2 text-sm">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-red-300">
              {stats.consecutiveFailures} consecutive failure
              {stats.consecutiveFailures > 1 ? "s" : ""} detected
            </span>
            {stats.consecutiveFailures >= 3 && (
              <Badge className="ml-auto bg-red-500/30 text-red-300">
                Consider adding signs
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-3 pt-2">
          {/* Suggestions List */}
          {suggestions && suggestions.length > 0 ? (
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.pattern}-${index}`}
                  className={`rounded-lg border p-3 transition-all ${getSeverityColor(
                    suggestion.severity
                  )}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getSeverityIcon(suggestion.severity)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">{suggestion.sign}</p>
                      <p className="mt-1 text-xs text-slate-400">{suggestion.reason}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs border-slate-600 text-slate-400"
                        >
                          {suggestion.pattern.replace(/_/g, " ")}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {suggestion.confidence}% confidence
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAcceptSuggestion(suggestion)}
                        className="h-8 px-2 text-green-400 hover:bg-green-500/20 hover:text-green-300"
                        title="Add to PROMPT.md"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDismissSuggestion(suggestion)}
                        className="h-8 px-2 text-slate-400 hover:bg-slate-700 hover:text-white"
                        title="Dismiss"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : stats?.lastFailure ? (
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
              <p className="text-sm text-slate-400">
                No pattern-based suggestions available
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateCustomSign}
                disabled={generatingCustom}
                className="mt-3 border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
              >
                {generatingCustom ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Custom Sign with AI
                  </>
                )}
              </Button>
            </div>
          ) : null}

          {/* Generate Custom Sign Button */}
          {suggestions && suggestions.length > 0 && stats?.lastFailure && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateCustomSign}
              disabled={generatingCustom}
              className="w-full border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
            >
              {generatingCustom ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Generating custom sign...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Custom Sign with AI
                </>
              )}
            </Button>
          )}

          {/* Top Failure Patterns */}
          {stats && stats.topPatterns.length > 0 && (
            <div className="mt-3 border-t border-slate-700 pt-3">
              <p className="mb-2 text-xs font-medium text-slate-400">
                Top Failure Patterns
              </p>
              <div className="flex flex-wrap gap-1">
                {stats.topPatterns.map((p) => (
                  <Badge
                    key={p.pattern}
                    variant="outline"
                    className="text-xs border-slate-600 text-slate-400"
                  >
                    {p.pattern.replace(/_/g, " ")} ({p.count})
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
