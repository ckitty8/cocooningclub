import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Download } from "lucide-react";

interface Atelier {
  id: string;
  title: string;
  date: string;
}

interface Reservation {
  id: string;
  status: string;
  created_at: string;
  member: { id: string; first_name: string; last_name: string; email: string };
}

const AdminReservations = () => {
  const [ateliers, setAteliers] = useState<Atelier[]>([]);
  const [selectedAtelier, setSelectedAtelier] = useState("");
  const [reservations, setReservations] = useState<Reservation[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("ateliers").select("id, title, date").order("date", { ascending: false });
      if (data) setAteliers(data);
    };
    fetch();
  }, []);

  useEffect(() => {
    if (!selectedAtelier) { setReservations([]); return; }
    const fetch = async () => {
      const { data } = await supabase
        .from("reservations")
        .select("id, status, created_at, member:member_id(id, first_name, last_name, email)")
        .eq("atelier_id", selectedAtelier)
        .order("created_at", { ascending: true });
      if (data) setReservations(data as unknown as Reservation[]);
    };
    fetch();
  }, [selectedAtelier]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
    if (error) { toast.error("Erreur."); return; }
    toast.success(`Statut mis à jour : ${status}`);
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const exportCSV = () => {
    if (reservations.length === 0) return;
    const atelier = ateliers.find((a) => a.id === selectedAtelier);
    const header = "Nom,Prénom,Email,Date réservation,Statut\n";
    const rows = reservations.map((r) =>
      `${r.member.last_name},${r.member.first_name},${r.member.email},${new Date(r.created_at).toLocaleDateString("fr-FR")},${r.status}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reservations-${atelier?.title || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusButtons: { label: string; value: string; style: string }[] = [
    { label: "Présent(e)", value: "presente", style: "bg-green-50 text-green-700 hover:bg-green-100" },
    { label: "Absent(e)", value: "absente", style: "bg-red-50 text-red-700 hover:bg-red-100" },
    { label: "Annulée", value: "annulee", style: "bg-gray-50 text-gray-600 hover:bg-gray-100" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-display font-bold text-foreground mb-8">Gestion des réservations</h1>

      {/* Filtre par atelier */}
      <div className="flex flex-wrap items-center gap-4 mb-8">
        <select
          value={selectedAtelier}
          onChange={(e) => setSelectedAtelier(e.target.value)}
          className="rounded-xl border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring min-w-[300px]"
        >
          <option value="">Sélectionner un atelier...</option>
          {ateliers.map((a) => (
            <option key={a.id} value={a.id}>{a.title} — {a.date}</option>
          ))}
        </select>

        {reservations.length > 0 && (
          <button onClick={exportCSV} className="flex items-center gap-2 border px-4 py-2.5 rounded-full text-sm font-medium hover:bg-muted transition-colors">
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
        )}
      </div>

      {/* Table */}
      {selectedAtelier && (
        <div className="bg-card rounded-2xl border overflow-hidden">
          {reservations.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">Aucune réservation pour cet atelier.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-4 font-medium">Membre</th>
                  <th className="p-4 font-medium hidden md:table-cell">Email</th>
                  <th className="p-4 font-medium hidden md:table-cell">Date réservation</th>
                  <th className="p-4 font-medium">Statut</th>
                  <th className="p-4 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reservations.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="p-4 font-medium text-foreground">{r.member.first_name} {r.member.last_name}</td>
                    <td className="p-4 hidden md:table-cell text-foreground/70">{r.member.email}</td>
                    <td className="p-4 hidden md:table-cell text-foreground/70">{new Date(r.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${
                        r.status === "confirmee" ? "bg-blue-50 text-blue-700" :
                        r.status === "presente" ? "bg-green-50 text-green-700" :
                        r.status === "absente" ? "bg-red-50 text-red-700" :
                        "bg-gray-50 text-gray-600"
                      }`}>{r.status}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        {statusButtons.map((btn) => (
                          <button
                            key={btn.value}
                            onClick={() => updateStatus(r.id, btn.value)}
                            disabled={r.status === btn.value}
                            className={`text-xs px-2 py-1 rounded-lg transition-colors disabled:opacity-30 ${btn.style}`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminReservations;
