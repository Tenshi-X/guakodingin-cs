"use client";

import dynamic from "next/dynamic";
import { demoAgents } from "@/lib/demo";

const InboxApp = dynamic(() => import("@/components/inbox-app"), { ssr: false });
export default function DemoClient({ loginAvailable }: { loginAvailable: boolean }) { return <InboxApp currentUser={demoAgents[0]} demo loginAvailable={loginAvailable} />; }
