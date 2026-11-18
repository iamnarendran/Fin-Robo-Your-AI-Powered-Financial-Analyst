import type { Metadata } from "next";
import { Suspense } from "react";
import { Chat } from "@/components/chat/chat";

export const metadata: Metadata = {
  title: "Ask the AI analyst",
  description: "Ask Fin-Robo about any Indian or global stock. Answers come as live charts, comparisons and explainers.",
};

export default function AskPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-[60vh] w-full max-w-3xl" />}>
      <Chat />
    </Suspense>
  );
}
