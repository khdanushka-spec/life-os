import { Sparkles, TriangleAlert } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChatPanel } from "@/components/ai/chat-panel";
import { isAiConfigured } from "@/lib/ai/config";

export default function AiPage() {
  const configured = isAiConfigured();

  return (
    <div className="mx-auto flex h-[calc(100svh-3.5rem)] max-w-2xl flex-col p-4 md:p-6">
      <Card className="flex flex-1 flex-col overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            AI Brain
          </CardTitle>
          <CardDescription>
            It currently knows your pending tasks - more life areas join as
            they&apos;re built.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col overflow-hidden">
          {configured ? (
            <ChatPanel />
          ) : (
            <Alert>
              <TriangleAlert />
              <AlertTitle>AI isn&apos;t configured yet</AlertTitle>
              <AlertDescription>
                Set ANTHROPIC_API_KEY or OPENAI_API_KEY to enable the AI
                Brain.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
