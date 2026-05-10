import { redirect } from "next/navigation";

// Redirect home → dashboard profile for demo purposes
export default function Home() {
  redirect("/dashboard/profile");
}
