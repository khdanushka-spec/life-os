import { Sparkles, TriangleAlert } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChatPanel } from "@/components/ai/chat-panel";
import { resolveAiModel } from "@/lib/ai/providers";

// Which provider is available (Ollama reachable? which API key is set?) can
// change per request/deployment - this must never be cached as a static page.
export const dynamic = "force-dynamic";

export default async function AiPage() {
  const resolved = await resolveAiModel();

  return (
    <div className="mx-auto flex h-[calc(100svh-3.5rem)] max-w-2xl flex-col p-4 md:p-6">
      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            Aura Brain
            {resolved && (
              <Badge variant="secondary" className="font-normal">
                {resolved.label}
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            It currently knows your pending tasks - more life areas join as
            they&apos;re built.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col overflow-hidden">
          {resolved ? (
            <ChatPanel />
          ) : (
            <Alert>
              <TriangleAlert />
              <AlertTitle>No AI provider available</AlertTitle>
              <AlertDescription>
                Start Ollama locally (localhost:11434), or set
                ANTHROPIC_API_KEY or OPENAI_API_KEY to enable Aura Brain.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
