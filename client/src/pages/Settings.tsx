import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  Key,
  Eye,
  EyeOff,
  Check,
  X,
  Trash2,
  RefreshCw,
  Shield,
  Zap,
  Bot,
  Sparkles,
  ArrowLeft,
  Bell,
} from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";
import { NotificationSettings } from "@/components/NotificationSettings";

type Provider = "codex" | "claude" | "gemini" | "manus";

const providerConfig: Record<
  Provider,
  {
    name: string;
    icon: React.ReactNode;
    color: string;
    placeholder: string;
    description: string;
  }
> = {
  codex: {
    name: "OpenAI Codex",
    icon: <Zap className="w-5 h-5" />,
    color: "text-green-400",
    placeholder: "sk-...",
    description: "For code completion and generation",
  },
  claude: {
    name: "Anthropic Claude",
    icon: <Bot className="w-5 h-5" />,
    color: "text-orange-400",
    placeholder: "sk-ant-...",
    description: "For autonomous coding with Claude Code",
  },
  gemini: {
    name: "Google Gemini",
    icon: <Sparkles className="w-5 h-5" />,
    color: "text-blue-400",
    placeholder: "AIza...",
    description: "For multi-modal AI capabilities",
  },
  manus: {
    name: "Manus AI",
    icon: <Shield className="w-5 h-5" />,
    color: "text-purple-400",
    placeholder: "manus-...",
    description: "For integrated Manus workflows",
  },
};

function ApiKeyCard({ provider }: { provider: Provider }) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const config = providerConfig[provider];
  const utils = trpc.useUtils();

  const { data: existingKey, isLoading } = trpc.apiKeys.getForProvider.useQuery(
    { provider }
  );

  const saveMutation = trpc.apiKeys.save.useMutation({
    onSuccess: _data => {
      toast.success(`${config.name} API key saved successfully`);
      setApiKey("");
      setIsEditing(false);
      utils.apiKeys.list.invalidate();
      utils.apiKeys.getForProvider.invalidate({ provider });
    },
    onError: error => {
      toast.error(`Failed to save API key: ${error.message}`);
    },
  });

  const deleteMutation = trpc.apiKeys.delete.useMutation({
    onSuccess: () => {
      toast.success(`${config.name} API key deleted`);
      utils.apiKeys.list.invalidate();
      utils.apiKeys.getForProvider.invalidate({ provider });
    },
    onError: error => {
      toast.error(`Failed to delete API key: ${error.message}`);
    },
  });

  const validateMutation = trpc.apiKeys.validate.useMutation({
    onSuccess: data => {
      if (data.valid) {
        toast.success(`${config.name} API key is valid`);
      } else {
        toast.error(data.error || "API key validation failed");
      }
      utils.apiKeys.getForProvider.invalidate({ provider });
    },
  });

  const handleSave = () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }
    saveMutation.mutate({ provider, apiKey: apiKey.trim() });
  };

  const handleDelete = () => {
    if (existingKey?.id) {
      deleteMutation.mutate({ id: existingKey.id });
    }
  };

  const handleValidate = () => {
    validateMutation.mutate({ provider });
  };

  return (
    <Card className="bg-black/40 border border-purple-500/30 hover:border-purple-500/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-purple-500/10 ${config.color}`}>
              {config.icon}
            </div>
            <div>
              <CardTitle className="text-lg font-orbitron text-purple-100">
                {config.name}
              </CardTitle>
              <CardDescription className="text-purple-300/60 text-sm">
                {config.description}
              </CardDescription>
            </div>
          </div>
          {existingKey && (
            <div className="flex items-center gap-2">
              {existingKey.isValid ? (
                <span className="flex items-center gap-1 text-green-400 text-sm">
                  <Check className="w-4 h-4" /> Valid
                </span>
              ) : (
                <span className="flex items-center gap-1 text-red-400 text-sm">
                  <X className="w-4 h-4" /> Invalid
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-10 bg-purple-500/10 animate-pulse rounded" />
        ) : existingKey && !isEditing ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-purple-900/20 rounded-lg border border-purple-500/20">
              <Key className="w-4 h-4 text-purple-400" />
              <span className="font-mono text-purple-200">
                ••••••••••••{existingKey.keyHint}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="flex-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/10"
              >
                Update Key
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleValidate}
                disabled={validateMutation.isPending}
                className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
              >
                <RefreshCw
                  className={`w-4 h-4 ${validateMutation.isPending ? "animate-spin" : ""}`}
                />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="border-red-500/30 text-red-300 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={config.placeholder}
                className="bg-purple-900/20 border-purple-500/30 text-purple-100 placeholder:text-purple-400/40 pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-300"
              >
                {showKey ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !apiKey.trim()}
                className="flex-1 bg-purple-600 hover:bg-purple-500 text-white"
              >
                {saveMutation.isPending ? "Saving..." : "Save API Key"}
              </Button>
              {isEditing && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setApiKey("");
                  }}
                  className="border-purple-500/30 text-purple-300"
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Card className="bg-black/40 border border-purple-500/30 p-8 text-center max-w-md">
          <Shield className="w-16 h-16 text-purple-500 mx-auto mb-4" />
          <h2 className="text-2xl font-orbitron text-purple-100 mb-2">
            Authentication Required
          </h2>
          <p className="text-purple-300/60 mb-6">
            Please sign in to manage your API keys and settings.
          </p>
          <Button
            asChild
            className="bg-purple-600 hover:bg-purple-500 text-white"
          >
            <a href={getLoginUrl()}>Sign In</a>
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-purple-100">
      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(139, 92, 246, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              className="text-purple-400 hover:text-purple-300 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-4xl font-orbitron font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            Settings
          </h1>
          <p className="text-purple-300/60 mt-2">
            Configure your API keys and preferences for Agents by Valentine RF
          </p>
        </div>

        {/* User Info */}
        <Card className="bg-black/40 border border-purple-500/30 mb-8">
          <CardHeader>
            <CardTitle className="font-orbitron text-purple-100">
              Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                {user?.name?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <p className="text-purple-100 font-medium">
                  {user?.name || "User"}
                </p>
                <p className="text-purple-400/60 text-sm">
                  {user?.email || "No email"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* API Keys Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-orbitron font-semibold text-purple-100 mb-4 flex items-center gap-2">
            <Key className="w-6 h-6 text-purple-400" />
            API Keys
          </h2>
          <p className="text-purple-300/60 mb-6">
            Your API keys are encrypted and stored securely. They are used to
            connect to AI providers for autonomous coding workflows.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            {(["claude", "codex", "gemini", "manus"] as Provider[]).map(
              provider => (
                <ApiKeyCard key={provider} provider={provider} />
              )
            )}
          </div>
        </div>

        {/* Notification Settings */}
        <div className="mb-8">
          <h2 className="text-2xl font-orbitron font-semibold text-purple-100 mb-4 flex items-center gap-2">
            <Bell className="w-6 h-6 text-purple-400" />
            Notifications
          </h2>
          <p className="text-purple-300/60 mb-6">
            Configure browser notifications to stay informed about your RALPH
            loops even when you step away.
          </p>
          <NotificationSettings />
        </div>

        {/* Security Notice */}
        <Card className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Shield className="w-8 h-8 text-purple-400 flex-shrink-0" />
              <div>
                <h3 className="font-orbitron text-purple-100 mb-2">
                  Security Notice
                </h3>
                <p className="text-purple-300/60 text-sm">
                  Your API keys are encrypted using AES-256-GCM before being
                  stored in the database. Keys are only decrypted when needed
                  for API calls and are never exposed in logs or responses. We
                  recommend rotating your keys periodically and using keys with
                  minimal required permissions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
