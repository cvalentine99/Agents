import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, BookOpen, Brain, CheckCircle2, Clock, FileText, Loader2, Search, Sparkles } from "lucide-react";
import { Streamdown } from "streamdown";
import { formatDistanceToNow } from "date-fns";

export default function PublicResearch() {
  const [, params] = useRoute("/research/share/:shareToken");
  const shareToken = params?.shareToken || "";
  
  const { data: research, isLoading, error } = trpc.research.getPublic.useQuery(
    { shareToken },
    { enabled: !!shareToken }
  );
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="border-yellow-500 text-yellow-500"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case "researching":
        return <Badge variant="outline" className="border-blue-500 text-blue-500"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Researching</Badge>;
      case "synthesizing":
        return <Badge variant="outline" className="border-purple-500 text-purple-500"><Brain className="w-3 h-3 mr-1" /> Synthesizing</Badge>;
      case "complete":
        return <Badge variant="outline" className="border-green-500 text-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Complete</Badge>;
      case "failed":
        return <Badge variant="outline" className="border-red-500 text-red-500"><AlertCircle className="w-3 h-3 mr-1" /> Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-purple-400 mx-auto mb-4" />
          <p className="text-slate-400">Loading research...</p>
        </div>
      </div>
    );
  }
  
  if (error || !research) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950 flex items-center justify-center">
        <Card className="bg-slate-900/50 border-red-500/30 max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Research Not Found</h2>
            <p className="text-slate-400">This research may have been removed or the link is invalid.</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
      {/* Header */}
      <div className="border-b border-purple-500/20 bg-slate-950/80 backdrop-blur-sm">
        <div className="container py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Search className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-purple-400">Shared Research</p>
              <h1 className="text-2xl font-bold text-white">Agents by Valentine RF</h1>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="container py-8">
        <Card className="bg-slate-900/50 border-purple-500/20">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-white text-xl">{research.topic}</CardTitle>
                <div className="flex items-center gap-3 mt-2">
                  {getStatusBadge(research.status)}
                  <Badge variant="outline" className="border-slate-600 text-slate-400 capitalize">
                    {research.depth}
                  </Badge>
                  {research.sourcesCount > 0 && (
                    <Badge variant="outline" className="border-slate-600 text-slate-400">
                      {research.sourcesCount} sources
                    </Badge>
                  )}
                  <span className="text-xs text-slate-500">
                    {formatDistanceToNow(new Date(research.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="summary" className="w-full">
              <TabsList className="bg-slate-800/50 border border-slate-700">
                <TabsTrigger value="summary" className="data-[state=active]:bg-purple-600">Summary</TabsTrigger>
                <TabsTrigger value="findings" className="data-[state=active]:bg-purple-600">Findings ({research.findings?.length || 0})</TabsTrigger>
                <TabsTrigger value="followups" className="data-[state=active]:bg-purple-600">Q&A ({research.followUps?.length || 0})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="summary" className="mt-4">
                <ScrollArea className="h-[600px]">
                  {research.summary ? (
                    <div className="prose prose-invert prose-purple max-w-none">
                      <Streamdown>{research.summary}</Streamdown>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                      <FileText className="w-8 h-8 mb-4 opacity-50" />
                      <p>No summary available</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="findings" className="mt-4">
                <ScrollArea className="h-[600px]">
                  {research.findings && research.findings.length > 0 ? (
                    <div className="space-y-4">
                      {research.findings.map((finding) => (
                        <Card key={finding.id} className="bg-slate-800/50 border-slate-700">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-base text-white">{finding.title}</CardTitle>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                                  {finding.sourceType}
                                </Badge>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    finding.confidence === "high" ? "border-green-500 text-green-400" :
                                    finding.confidence === "medium" ? "border-yellow-500 text-yellow-400" :
                                    "border-red-500 text-red-400"
                                  }`}
                                >
                                  {finding.confidence}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-slate-300">{finding.content}</p>
                            <div className="mt-2 flex items-center gap-2">
                              <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-purple-500" 
                                  style={{ width: `${finding.relevanceScore}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-500">{finding.relevanceScore}% relevant</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                      <Search className="w-8 h-8 mb-4 opacity-50" />
                      <p>No findings available</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="followups" className="mt-4">
                <ScrollArea className="h-[600px]">
                  {research.followUps && research.followUps.length > 0 ? (
                    <div className="space-y-4">
                      {research.followUps.map((followUp) => (
                        <Card key={followUp.id} className="bg-slate-800/50 border-slate-700">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base text-purple-400 flex items-center gap-2">
                              <Sparkles className="w-4 h-4" />
                              Q: {followUp.question}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            {followUp.answer ? (
                              <div className="prose prose-invert prose-sm max-w-none">
                                <Streamdown>{followUp.answer}</Streamdown>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500 italic">Processing...</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                      <BookOpen className="w-8 h-8 mb-4 opacity-50" />
                      <p>No follow-up questions</p>
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        {/* Footer */}
        <div className="mt-8 text-center text-slate-500 text-sm">
          <p>Powered by <span className="text-purple-400">Agents by Valentine RF</span> - Deep Research</p>
        </div>
      </div>
    </div>
  );
}
