"use client";
import dynamic from "next/dynamic";

const NotifyDiscordTest = dynamic(() => import("../notify-discord-test"), { ssr: false });

export default function NotifyDiscordTestPage() {
  return <NotifyDiscordTest />;
}
