import {
  Heart,
  Truck,
  Scale,
  Plane,
  Code,
  BookOpen,
  Home,
  Briefcase,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  Heart,
  Truck,
  Scale,
  Plane,
  Code,
  BookOpen,
  Home,
  Briefcase,
  HelpCircle,
};

export function getCategoryIcon(iconName: string): LucideIcon {
  return iconMap[iconName] ?? HelpCircle;
}
