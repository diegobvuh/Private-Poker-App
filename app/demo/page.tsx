import { ClubCockpit } from "@/components/club-cockpit";
import { connection } from "next/server";

export default async function DemoPage() {
  await connection();
  return <ClubCockpit mode="demo" />;
}
