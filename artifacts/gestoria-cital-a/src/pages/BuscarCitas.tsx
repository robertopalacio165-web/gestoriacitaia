import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Navbar } from "@/components/Navbar";
import { useLang } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Settings,
  Mic,
  MicOff,
  RefreshCw,
  Shield,
  Bell,
  CheckCircle2,
  ExternalLink,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useScheduleAppointment } from "@/hooks/use-appointments";
import { supabase } from "@/lib/supabaseClient";

interface ChatMsg {
  from: "agent" | "user";
  text: string;
  ts?: number;
}

type TramiteItem = {
  value: string;
  label: string;
};

type DocState = "ok" | "warn" | "missing";

type DocItem = {
  nombre: string;
  estado: DocState;
};

type FormItem = {
  nombre: string;
  codigo: string;
  url: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  nie: string | null;
};

type AppointmentResult = {
  tramite?: string | null;
  date?: string | null;
  time?: string | null;
  office?: string | null;
  locator?: string | null;
  pdf_url?: string | null;
  confirmation_pdf_url?: string | null;
};

type ClientFormData = {

  fullName: string;
  phone: string;
  email: string;

  expedienteNumero: string;
  identificadorSolicitud: string;
  fechaNacimiento: string;

  nie: string;
  passport: string;
  nationality: string;
  birthYear: string;
  city: string;
  province: string;
  preferredOffice: string;
};

function OfficialBrowserBox({
  language,
  avatarImage,
  title,
  url,
  selectedTramiteLabel,
  profileLoading,
  ui,
  confirmed,
  appointmentData,
  finalDate,
  finalTime,
  finalOffice,
  finalLocator,
  finalPdfUrl,
  hasRealAppointment,
  onRefresh,
