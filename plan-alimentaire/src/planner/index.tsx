import { useState } from "react";
import type { UserProfile, WeekPlan } from "./types";
import StepProfile from "./StepProfile";
import StepPlan from "./StepPlan";
import StepRecap from "./StepRecap";

type Step = "profile" | "plan" | "recap";

export default function MadameProteinePlanner() {
  const [step, setStep] = useState<Step>("profile");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [week, setWeek] = useState<WeekPlan | null>(null);

  if (step === "profile") {
    return <StepProfile onNext={p => { setProfile(p); setStep("plan"); }} />;
  }
  if (step === "plan" && profile) {
    return <StepPlan profile={profile} onBack={() => setStep("profile")} onNext={w => { setWeek(w); setStep("recap"); }} />;
  }
  if (step === "recap" && profile && week) {
    return <StepRecap profile={profile} week={week} onBack={() => setStep("plan")} />;
  }
  return null;
}
