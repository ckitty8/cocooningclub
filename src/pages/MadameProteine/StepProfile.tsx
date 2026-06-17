import { useState } from "react";
import { UserProfile, ActivityLevel } from "./types";
import { calcIMC, calcDuration, calcCalorieStats } from "./calculations";
import { ALLERGEN_OPTIONS } from "./foodData";

interface Props {
  onNext: (profile: UserProfile) => void;
}

const ACTIVITIES: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: "sedentaire", label: "Sédentaire", desc: "Peu ou pas d'exercice" },
  { value: "leger", label: "Légèrement actif", desc: "Exercice léger 1-3j/sem" },
  { value: "actif", label: "Actif", desc: "Exercice modéré 3-5j/sem" },
  { value: "tres_actif", label: "Très actif", desc: "Sport intensif 6-7j/sem" },
];

export default function StepProfile({ onNext }: Props) {
  const [form, setForm] = useState<UserProfile>({
    prenom: "",
    poidsActuel: 70,
    poidsObjectif: 60,
    dateObjectif: "",
    taille: 165,
    activite: "leger",
    allergies: [],
    autresExclusions: "",
  });

  const set = (k: keyof UserProfile, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const toggleAllergie = (id: string) => {
    set("allergies", form.allergies.includes(id)
      ? form.allergies.filter(a => a !== id)
      : [...form.allergies, id]);
  };

  const imc = calcIMC(form.poidsActuel, form.taille);
  const kgAPerdre = Math.max(0, form.poidsActuel - form.poidsObjectif);
  const semaines = form.dateObjectif ? calcDuration(form.dateObjectif) : null;
  const stats = calcCalorieStats(form);

  const imcLabel = imc < 18.5 ? "Insuffisance pondérale" : imc < 25 ? "Poids normal" : imc < 30 ? "Surpoids" : "Obésité";
  const imcColor = imc < 18.5 ? "text-blue-600" : imc < 25 ? "text-green-600" : imc < 30 ? "text-orange-500" : "text-red-600";

  const valid = form.prenom.trim() && form.dateObjectif;

  return (
    <div className="min-h-screen bg-[#FAF8F5] py-10 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-xs uppercase tracking-widest text-[#B89A7A] font-semibold mb-2">Cocooning Club</p>
          <h1 className="text-3xl font-bold text-[#3D2B1F] mb-1">Mon Plan Alimentaire</h1>
          <p className="text-[#7A6352] text-sm">Style Madame Protéine · Personnalisé · Imprimable</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-[#E8DDD4] p-8 space-y-8">
          {/* Prénom */}
          <div>
            <label className="block text-sm font-semibold text-[#3D2B1F] mb-2">Prénom *</label>
            <input
              type="text"
              value={form.prenom}
              onChange={e => set("prenom", e.target.value)}
              placeholder="Ton prénom"
              className="w-full border border-[#D9CEBF] rounded-lg px-4 py-3 text-[#3D2B1F] focus:outline-none focus:ring-2 focus:ring-[#B89A7A] bg-[#FAF8F5]"
            />
          </div>

          {/* Poids + taille */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-[#3D2B1F] mb-2">Poids actuel (kg)</label>
              <input type="number" min={30} max={250} value={form.poidsActuel}
                onChange={e => set("poidsActuel", +e.target.value)}
                className="w-full border border-[#D9CEBF] rounded-lg px-4 py-3 text-[#3D2B1F] focus:outline-none focus:ring-2 focus:ring-[#B89A7A] bg-[#FAF8F5]" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#3D2B1F] mb-2">Poids objectif (kg)</label>
              <input type="number" min={30} max={250} value={form.poidsObjectif}
                onChange={e => set("poidsObjectif", +e.target.value)}
                className="w-full border border-[#D9CEBF] rounded-lg px-4 py-3 text-[#3D2B1F] focus:outline-none focus:ring-2 focus:ring-[#B89A7A] bg-[#FAF8F5]" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#3D2B1F] mb-2">Taille (cm)</label>
              <input type="number" min={100} max={220} value={form.taille}
                onChange={e => set("taille", +e.target.value)}
                className="w-full border border-[#D9CEBF] rounded-lg px-4 py-3 text-[#3D2B1F] focus:outline-none focus:ring-2 focus:ring-[#B89A7A] bg-[#FAF8F5]" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#3D2B1F] mb-2">Date objectif *</label>
              <input type="date" value={form.dateObjectif}
                onChange={e => set("dateObjectif", e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full border border-[#D9CEBF] rounded-lg px-4 py-3 text-[#3D2B1F] focus:outline-none focus:ring-2 focus:ring-[#B89A7A] bg-[#FAF8F5]" />
            </div>
          </div>

          {/* Calculs auto */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#F5EFE9] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[#B89A7A]">{kgAPerdre} kg</p>
              <p className="text-xs text-[#7A6352] mt-1">à perdre</p>
            </div>
            <div className="bg-[#F5EFE9] rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${imcColor}`}>{imc}</p>
              <p className="text-xs text-[#7A6352] mt-1">{imcLabel}</p>
            </div>
            <div className="bg-[#F5EFE9] rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-[#B89A7A]">{semaines ?? "—"}</p>
              <p className="text-xs text-[#7A6352] mt-1">{semaines ? "semaines" : "date à choisir"}</p>
            </div>
          </div>

          {/* Activité */}
          <div>
            <label className="block text-sm font-semibold text-[#3D2B1F] mb-3">Niveau d'activité</label>
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITIES.map(a => (
                <button key={a.value} type="button"
                  onClick={() => set("activite", a.value)}
                  className={`text-left px-4 py-3 rounded-xl border-2 transition-all ${form.activite === a.value
                    ? "border-[#B89A7A] bg-[#F5EFE9]"
                    : "border-[#D9CEBF] bg-white hover:bg-[#FAF8F5]"}`}>
                  <p className="font-semibold text-sm text-[#3D2B1F]">{a.label}</p>
                  <p className="text-xs text-[#7A6352]">{a.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Allergies */}
          <div>
            <label className="block text-sm font-semibold text-[#3D2B1F] mb-3">Allergies / Exclusions alimentaires</label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {ALLERGEN_OPTIONS.map(a => (
                <label key={a.id} className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={form.allergies.includes(a.id)}
                    onChange={() => toggleAllergie(a.id)}
                    className="rounded border-[#D9CEBF] text-[#B89A7A] focus:ring-[#B89A7A]" />
                  <span className="text-sm text-[#3D2B1F] group-hover:text-[#B89A7A]">{a.label}</span>
                </label>
              ))}
            </div>
            <input type="text" placeholder="Autres exclusions (ex: veau, champignons…)"
              value={form.autresExclusions}
              onChange={e => set("autresExclusions", e.target.value)}
              className="w-full border border-[#D9CEBF] rounded-lg px-4 py-3 text-sm text-[#3D2B1F] focus:outline-none focus:ring-2 focus:ring-[#B89A7A] bg-[#FAF8F5]" />
          </div>

          {/* Résumé calorique */}
          <div className="bg-[#FDF6EE] border border-[#E8DDD4] rounded-xl p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-[#B89A7A] mb-3">Estimation calorique</p>
            <div className="grid grid-cols-2 gap-y-2 text-sm">
              <span className="text-[#7A6352]">Métabolisme de base (BMR)</span>
              <span className="font-semibold text-[#3D2B1F] text-right">{stats.bmr} kcal</span>
              <span className="text-[#7A6352]">Dépense totale (TDEE)</span>
              <span className="font-semibold text-[#3D2B1F] text-right">{stats.tdee} kcal</span>
              <span className="text-[#7A6352]">Déficit appliqué</span>
              <span className="font-semibold text-[#3D2B1F] text-right">−{stats.deficit} kcal</span>
              <span className="text-[#7A6352] font-semibold">Objectif journalier</span>
              <span className="font-bold text-[#B89A7A] text-right text-base">{stats.target} kcal</span>
              <span className="text-[#7A6352]">Perte estimée / semaine</span>
              <span className="font-semibold text-green-600 text-right">≈ {stats.estimatedWeeklyLoss} kg</span>
            </div>
          </div>

          <button
            disabled={!valid}
            onClick={() => onNext(form)}
            className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all ${valid
              ? "bg-[#B89A7A] hover:bg-[#A0856A] shadow-md hover:shadow-lg"
              : "bg-gray-300 cursor-not-allowed"}`}>
            Générer mon plan →
          </button>
        </div>
      </div>
    </div>
  );
}
