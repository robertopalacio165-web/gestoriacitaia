import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, CreditCard, Loader2, Mail, Phone, User } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";

type Category = {
  id: number;
  code: string;
  name_it: string;
  description_it: string | null;
  is_seasonal: boolean;
};

type PackageCode = "monthly" | "biweekly" | "single_category";

const CATEGORY_ICONS: Record<string, string> = {
  agriculture: "🌾",
  food: "🍝",
  textile: "👕",
  metal: "⚙️",
  other_industry: "🏭",
  construction: "🏗️",
  commerce: "🛒",
  hospitality: "🏨",
  tourism: "✈️",
  transport_logistics: "🚛",
  business_support: "🧹",
  health_social: "🏥",
  other_services: "💼",
  family_assistance: "👩‍👧",
};

const PACKAGE_INFO = [
  {
    code: "monthly" as PackageCode,
    title: "Offerte del mese",
    price: "9,99€",
    subtitle: "Pagamento unico · 30 giorni",
    features: ["Ricevi le offerte del mese", "Più categorie selezionabili", "Offerte filtrate per settore", "Invio tramite email"],
  },
  {
    code: "biweekly" as PackageCode,
    title: "Aggiornamenti ogni 15 giorni",
    price: "19,99€",
    subtitle: "Pagamento unico · 30 giorni",
    features: ["Offerte iniziali", "Nuove offerte ogni 15 giorni", "Più categorie selezionabili", "Invio automatico tramite email"],
  },
  {
    code: "single_category" as PackageCode,
    title: "Una sola categoria",
    price: "24,99€",
    subtitle: "Pagamento unico · 30 giorni",
    features: ["Una sola categoria professionale", "Solo offerte della categoria scelta", "Nuove offerte durante il periodo", "Invio automatico tramite email"],
  },
];

export default function DecretoFlussi2027() {
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    workType: "non_stagionale",
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageCode>("monthly");
  const [acceptTerms, setAcceptTerms] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from("flussi_categories")
        .select("id, code, name_it, description_it, is_seasonal")
        .eq("is_active", true)
        .order("id");

      if (error) {
        console.error(error);
        toast({ title: "Errore", description: "Non è stato possibile caricare le categorie.", variant: "destructive" });
      } else {
        setCategories((data || []) as Category[]);
      }
      setLoadingCategories(false);
    };
    loadCategories();
  }, [toast]);

  const selectedPackageInfo = useMemo(
    () => PACKAGE_INFO.find((item) => item.code === selectedPackage)!,
    [selectedPackage],
  );

  const updateField = (field: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const toggleCategory = (code: string) => {
    if (selectedPackage === "single_category") {
      setSelectedCategories((prev) => (prev.includes(code) ? [] : [code]));
      return;
    }
    setSelectedCategories((prev) =>
      prev.includes(code) ? prev.filter((item) => item !== code) : [...prev, code],
    );
  };

  const selectPackage = (code: PackageCode) => {
    setSelectedPackage(code);
    if (code === "single_category" && selectedCategories.length > 1) {
      setSelectedCategories(selectedCategories.slice(0, 1));
    }
  };

  const validate = () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast({ title: "Dati mancanti", description: "Inserisci nome e cognome.", variant: "destructive" });
      return false;
    }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      toast({ title: "Email non valida", description: "Inserisci un indirizzo email valido.", variant: "destructive" });
      return false;
    }
    const digits = form.phone.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 15) {
      toast({ title: "Numero non valido", description: "Inserisci un numero di telefono valido.", variant: "destructive" });
      return false;
    }
    if (!selectedCategories.length) {
      toast({ title: "Categoria mancante", description: "Seleziona almeno una categoria.", variant: "destructive" });
      return false;
    }
    if (selectedPackage === "single_category" && selectedCategories.length !== 1) {
      toast({ title: "Una sola categoria", description: "Questo pacchetto consente una sola categoria.", variant: "destructive" });
      return false;
    }
    if (!acceptTerms) {
      toast({ title: "Accettazione richiesta", description: "Devi accettare i termini del servizio.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handlePay = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const priceCents =
        selectedPackage === "monthly" ? 999 :
        selectedPackage === "biweekly" ? 1999 : 2499;

      const response = await fetch("/api/create-checkout-flussi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          email: form.email.trim().toLowerCase(),
          categories: selectedCategories,
          packageCode: selectedPackage,
          packagePriceCents: priceCents,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Impossibile avviare il pagamento.");
      window.location.href = data.url;
    } catch (error: any) {
      console.error("Flussi checkout error:", error);
      toast({ title: "Errore pagamento", description: error?.message || "Impossibile avviare il pagamento.", variant: "destructive" });
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground relative flex flex-col">
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-30"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(0,128,0,0.10), transparent), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(206,43,55,0.08), transparent)",
        }}
      />
      <Navbar />

      <main className="flex-1 relative z-10 flex flex-col pt-16 pb-8">
        <h1 className="text-xl sm:text-2xl font-display font-bold px-4 sm:px-6 py-4 max-w-7xl mx-auto w-full">
          Decreto Flussi 2027
        </h1>

        <div className="flex-1 flex flex-col lg:flex-row gap-4 px-4 sm:px-6 max-w-7xl mx-auto w-full">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="lg:w-[340px] xl:w-[380px] shrink-0 flex flex-col gap-3">
            <div className="relative rounded-2xl overflow-hidden border border-white/15 shadow-[0_0_30px_-5px_rgba(255,255,255,0.12)] bg-black">
              <div className="relative aspect-[4/5] min-h-[360px] lg:min-h-[520px]">
                <img
                  src="/images/decreto-flussi-2027.png"
                  alt="Decreto Flussi 2027"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/40 to-transparent" />
                <div className="absolute top-4 left-4 flex h-8 overflow-hidden rounded-md shadow-lg">
                  <span className="w-3 bg-[#009246]" />
                  <span className="w-3 bg-white" />
                  <span className="w-3 bg-[#CE2B37]" />
                </div>
                <div className="absolute bottom-0 inset-x-0 p-5 bg-gradient-to-t from-black/90 via-black/45 to-transparent">
                  <p className="text-white/70 text-xs uppercase tracking-[0.18em]">Lavoro in Italia</p>
                  <h2 className="text-white text-2xl sm:text-3xl font-black">DECRETO FLUSSI 2027</h2>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.section initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            className="flex-1 rounded-[24px] border-2 border-white/20 bg-gradient-to-b from-[#0b0b0b] to-[#050505] px-4 sm:px-6 py-5 shadow-[0_0_35px_rgba(0,0,0,0.25)]">
            <div className="mb-5 text-center">
              <div className="inline-flex h-7 overflow-hidden rounded-md shadow-[0_0_15px_rgba(255,255,255,0.12)]">
                <span className="w-2.5 bg-[#009246]" />
                <span className="w-2.5 bg-white" />
                <span className="w-2.5 bg-[#CE2B37]" />
              </div>
              <h2 className="mt-2 text-white text-[20px] sm:text-[24px] font-black">DECRETO FLUSSI 2027</h2>
              <p className="text-white/60 text-[12px]">Ricevi offerte di lavoro in Italia</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
              {[
                ["firstName", "Nome", "Nome", User],
                ["lastName", "Cognome", "Cognome", User],
                ["email", "Indirizzo email", "nome@gmail.com", Mail],
                ["phone", "Numero di telefono / WhatsApp", "+212 6 00 00 00 00", Phone],
              ].map(([field, label, placeholder, Icon]) => (
                <label key={field as string} className={`block ${(field === "email" || field === "phone") ? "md:col-span-2" : ""}`}>
                  <span className="block text-white text-[13px] mb-2">{label as string}</span>
                  <div className="relative">
                    <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/35" />
                    <input
                      type={field === "email" ? "email" : field === "phone" ? "tel" : "text"}
                      value={form[field as keyof typeof form]}
                      onChange={(e) => updateField(field as keyof typeof form, e.target.value)}
                      placeholder={placeholder as string}
                      className="w-full h-[52px] rounded-2xl border border-white/10 bg-[#060b16] pl-11 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-[#009246]"
                    />
                  </div>
                </label>
              ))}
            </div>

            <div className="mb-5">
              <p className="text-white text-[13px] mb-2">Tipo di lavoro</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  ["non_stagionale", "Lavoro non stagionale"],
                  ["stagionale", "Lavoro stagionale"],
                  ["entrambi", "Entrambi"],
                ].map(([value, label]) => (
                  <button key={value} type="button" onClick={() => updateField("workType", value)}
                    className={form.workType === value
                      ? "rounded-xl border border-[#009246] bg-[#009246]/10 p-3 text-left text-xs text-white"
                      : "rounded-xl border border-white/10 bg-[#060b16] p-3 text-left text-xs text-white/70 hover:border-white/25"}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <div className="flex items-end justify-between gap-3 mb-2">
                <div>
                  <p className="text-white text-[13px]">Categoria di lavoro</p>
                  <p className="text-white/40 text-[10px] mt-1">Seleziona i settori che ti interessano.</p>
                </div>
                {selectedPackage === "single_category" && <span className="text-[#CE2B37] text-[10px] font-bold">Una sola categoria</span>}
              </div>

              {loadingCategories ? (
                <div className="flex items-center justify-center py-8 text-white/50 text-sm">
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Caricamento categorie...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {categories.map((category) => {
                    const selected = selectedCategories.includes(category.code);
                    const disabled = selectedPackage === "single_category" && !selected && selectedCategories.length >= 1;
                    return (
                      <button key={category.code} type="button" disabled={disabled} onClick={() => toggleCategory(category.code)}
                        className={selected
                          ? "flex items-center gap-3 rounded-xl border border-[#009246] bg-[#009246]/10 p-3 text-left"
                          : disabled
                            ? "flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3 text-left opacity-35 cursor-not-allowed"
                            : "flex items-center gap-3 rounded-xl border border-white/10 bg-[#060b16] p-3 text-left hover:border-[#009246]/50"}>
                        <span className="text-lg shrink-0">{CATEGORY_ICONS[category.code] || "💼"}</span>
                        <span className="min-w-0">
                          <span className="block text-white/90 text-[11px] sm:text-[12px]">{category.name_it}</span>
                          {category.is_seasonal && <span className="text-[9px] text-white/35">Lavoro stagionale</span>}
                        </span>
                        {selected && <CheckCircle2 className="ml-auto w-4 h-4 text-[#009246] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mb-5">
              <p className="text-white text-[13px] mb-2">Scegli il tuo pacchetto</p>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {PACKAGE_INFO.map((pkg) => {
                  const selected = selectedPackage === pkg.code;
                  return (
                    <button key={pkg.code} type="button" onClick={() => selectPackage(pkg.code)}
                      className={selected
                        ? "text-left rounded-[22px] border-2 border-[#009246] bg-gradient-to-b from-[#0b160f] to-[#050505] p-4 shadow-[0_0_30px_rgba(0,146,70,0.12)]"
                        : "text-left rounded-[22px] border border-white/10 bg-[#060b16] p-4 hover:border-white/25"}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-white text-[14px] font-bold">{pkg.title}</p>
                          <p className="text-white/40 text-[10px] mt-1">{pkg.subtitle}</p>
                        </div>
                        <p className="text-[#CE2B37] text-[25px] font-black leading-none">{pkg.price}</p>
                      </div>
                      <ul className="mt-3 space-y-1.5 text-white/65 text-[11px]">
                        {pkg.features.map((feature) => <li key={feature}>✓ {feature}</li>)}
                      </ul>
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-start gap-3 mb-4 cursor-pointer">
              <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-1 w-4 h-4 accent-[#009246]" />
              <span className="text-white/55 text-[10px] leading-relaxed">
                Accetto i termini del servizio e l'informativa sulla privacy. Il servizio fornisce informazioni e offerte; non garantisce l'assunzione, il contratto o l'ingresso in Italia.
              </span>
            </label>

            <button type="button" onClick={handlePay} disabled={submitting}
              className="w-full h-[54px] rounded-2xl bg-gradient-to-r from-[#009246] via-white to-[#CE2B37] p-[1px] disabled:opacity-60">
              <span className="flex h-full w-full items-center justify-center gap-2 rounded-2xl bg-black text-white font-black">
                {submitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Connessione al pagamento...</> :
                  <><CreditCard className="w-5 h-5" /> Continua al pagamento · {selectedPackageInfo.price}</>}
              </span>
            </button>

            <p className="text-center text-white/25 text-[9px] mt-3">
              Pagamento sicuro. Dopo la conferma del pagamento attiveremo il pacchetto.
            </p>
          </motion.section>
        </div>
      </main>
    </div>
  );
}
