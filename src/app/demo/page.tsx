import DemoClient from "./demo-client";

export default function DemoPage() { return <DemoClient loginAvailable={!!process.env.DATABASE_URL} />; }
