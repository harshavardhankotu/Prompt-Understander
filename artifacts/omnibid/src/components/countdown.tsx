import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CountdownProps {
  endsAt: string;
  className?: string;
  large?: boolean;
}

export function Countdown({ endsAt, className, large }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(endsAt));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(endsAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [endsAt]);

  if (timeLeft.expired) {
    return (
      <span className={cn("text-muted-foreground font-mono", large ? "text-lg" : "text-xs", className)}>
        Expired
      </span>
    );
  }

  const isUrgent = timeLeft.totalSeconds < 3600;

  return (
    <span
      className={cn(
        "font-mono font-bold tabular-nums",
        large ? "text-2xl" : "text-xs",
        isUrgent ? "text-destructive" : "text-foreground",
        className
      )}
      data-testid="countdown-timer"
    >
      {timeLeft.hours > 0 && `${pad(timeLeft.hours)}:`}
      {pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
      {timeLeft.hours === 0 && timeLeft.minutes === 0 && (
        <span className="ml-1 text-destructive animate-pulse">!</span>
      )}
    </span>
  );
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function getTimeLeft(endsAt: string) {
  const diff = new Date(endsAt).getTime() - Date.now();
  if (diff <= 0) return { expired: true, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0 };
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { expired: false, hours, minutes, seconds, totalSeconds };
}
