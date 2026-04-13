import { Phone, Mail, MapPin, FileText, Calendar, MessageSquare } from "lucide-react";

export const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  call: Phone,
  email: Mail,
  visit: MapPin,
  memo: FileText,
  appointment: Calendar,
};

export const ACTIVITY_ICON_FALLBACK = MessageSquare;
