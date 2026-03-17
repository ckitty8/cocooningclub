import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User, Calendar, Clock, MapPin, X, Camera, LogOut, ChevronLeft, ChevronRight } from "lucide-react";
import Footer from "@/components/Footer";

interface Reservation {
  id: string;
  status: string;
  created_at: string;
  atelier: {
    id: string;
    title: string;
    date: string;
    time: string;
    location: string;
    photo_url: string | null;
  };
}

type Tab = "profil" | "passes" | "avenir" | "calendrier";

const Membre = () => {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("profil");
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [uploading, setUploading] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const fetchReservations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("reservations")
      .select("id, status, created_at, atelier:atelier_id(id, title, date, time, location, photo_url)")
      .eq("member_id", user.id);
    if (data) setReservations(data as unknown as Reservation[]);
  }, [user]);

  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        phone: profile.phone,
      });
    }
  }, [profile]);

  // Redirect admin to /admin
  useEffect(() => {
    if (profile?.role === "admin") navigate("/admin", { replace: true });
  }, [profile, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update(formData)
      .eq("id", user.id);

    if (error) {
      toast.error("Erreur lors de la mise à jour.");
      return;
    }
    toast.success("Profil mis à jour !");
    setEditing(false);
    refreshProfile();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    setUploading(true);
    const file = e.target.files[0];
    const filePath = `${user.id}/avatar.${file.name.split(".").pop()}`;

    const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    if (uploadError) {
      toast.error("Erreur lors de l'upload.");
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
    toast.success("Photo mise à jour !");
    setUploading(false);
    refreshProfile();
  };

  const handleCancelReservation = async (id: string) => {
    if (!confirm("Voulez-vous vraiment annuler cette réservation ?")) return;
    const { error } = await supabase.from("reservations").update({ status: "annulee" }).eq("id", id);
    if (error) {
      toast.error("Erreur lors de l'annulation.");
      return;
    }
    toast.success("Réservation annulée.");
    fetchReservations();
  };

  const today = new Date().toISOString().split("T")[0];
  const pastReservations = reservations.filter((r) => r.status === "presente" || (r.atelier.date < today && r.status !== "annulee"));
  const upcomingReservations = reservations.filter((r) => r.status === "confirmee" && r.atelier.date >= today);

  // Mini calendar helpers
  const calendarDays = (() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const offset = firstDay === 0 ? 6 : firstDay - 1; // Monday start
    const days: (number | null)[] = Array(offset).fill(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);
    return days;
  })();

  const reservedDates = new Set(reservations.filter((r) => r.status !== "annulee").map((r) => r.atelier.date));

  const tabs: { key: Tab; label: string }[] = [
    { key: "profil", label: "Mon profil" },
    { key: "passes", label: "Ateliers passés" },
    { key: "avenir", label: "Ateliers à venir" },
    { key: "calendrier", label: "Mon calendrier" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Nav */}
      <nav className="bg-background/95 backdrop-blur-md border-b">
        <div className="container mx-auto flex items-center justify-between py-4 px-6">
          <Link to="/" className="font-display text-2xl font-bold text-foreground tracking-[0.08em] uppercase">
            Cocooning Club
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden md:inline">
              {profile?.first_name} {profile?.last_name}
            </span>
            <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-foreground/70 hover:text-foreground transition-colors">
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 container mx-auto px-6 py-12">
        <h1 className="text-3xl font-display font-bold text-foreground mb-8">Espace Membre</h1>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8 border-b pb-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeTab === tab.key ? "bg-primary text-primary-foreground" : "text-foreground/60 hover:bg-muted"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mon profil */}
        {activeTab === "profil" && (
          <div className="max-w-2xl">
            <div className="bg-card rounded-2xl border p-8">
              <div className="flex items-start gap-6 mb-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-primary/10 overflow-hidden flex items-center justify-center">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-primary" />
                    )}
                  </div>
                  <label className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary text-primary-foreground rounded-full flex items-center justify-center cursor-pointer hover:opacity-90">
                    <Camera className="w-3.5 h-3.5" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                  </label>
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-foreground">
                    {profile?.first_name} {profile?.last_name}
                  </h2>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                </div>
              </div>

              {!editing ? (
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Prénom</span>
                    <span className="text-foreground">{profile?.first_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Nom</span>
                    <span className="text-foreground">{profile?.last_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Email</span>
                    <span className="text-foreground">{profile?.email}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Téléphone</span>
                    <span className="text-foreground">{profile?.phone || "—"}</span>
                  </div>
                  <button
                    onClick={() => setEditing(true)}
                    className="mt-4 bg-primary text-primary-foreground px-6 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    Modifier mes informations
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Prénom</label>
                      <input
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Nom</label>
                      <input
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                    <input
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Téléphone</label>
                    <input
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveProfile}
                      className="bg-primary text-primary-foreground px-6 py-2 rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      Enregistrer
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="border px-6 py-2 rounded-full text-sm font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ateliers passés */}
        {activeTab === "passes" && (
          <div className="space-y-4">
            {pastReservations.length === 0 ? (
              <div className="bg-card rounded-2xl border p-12 text-center">
                <p className="text-muted-foreground">Aucun atelier passé pour le moment.</p>
              </div>
            ) : (
              pastReservations.map((r) => (
                <div key={r.id} className="bg-card rounded-2xl border p-6 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {r.atelier.photo_url ? (
                      <img src={r.atelier.photo_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Calendar className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-foreground">{r.atelier.title}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {r.atelier.date}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.atelier.location}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Ateliers à venir */}
        {activeTab === "avenir" && (
          <div className="space-y-4">
            {upcomingReservations.length === 0 ? (
              <div className="bg-card rounded-2xl border p-12 text-center">
                <p className="text-muted-foreground">Aucun atelier à venir.</p>
                <Link to="/calendrier" className="inline-block mt-4 bg-primary text-primary-foreground px-6 py-2 rounded-full text-sm font-medium hover:opacity-90">
                  Voir le calendrier
                </Link>
              </div>
            ) : (
              upcomingReservations.map((r) => (
                <div key={r.id} className="bg-card rounded-2xl border p-6 flex items-center gap-4">
                  <div className="flex-1">
                    <h3 className="font-display font-semibold text-foreground">{r.atelier.title}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {r.atelier.date}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {r.atelier.time}</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {r.atelier.location}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-secondary/30 text-secondary-foreground px-3 py-1 rounded-full capitalize">{r.status}</span>
                    <button
                      onClick={() => handleCancelReservation(r.id)}
                      className="text-destructive hover:bg-destructive/10 p-2 rounded-lg transition-colors"
                      title="Annuler"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Mon calendrier */}
        {activeTab === "calendrier" && (
          <div className="max-w-md mx-auto">
            <div className="bg-card rounded-2xl border p-6">
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))} className="p-1 hover:bg-muted rounded">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h3 className="font-display font-semibold text-foreground capitalize">
                  {calendarMonth.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
                </h3>
                <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))} className="p-1 hover:bg-muted rounded">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground mb-2">
                {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                  <span key={d} className="py-1">{d}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-sm">
                {calendarDays.map((day, i) => {
                  if (day === null) return <span key={`empty-${i}`} />;
                  const dateStr = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const hasEvent = reservedDates.has(dateStr);
                  const isPast = dateStr < today;
                  return (
                    <span
                      key={day}
                      className={`py-2 rounded-lg relative ${hasEvent ? (isPast ? "bg-muted text-muted-foreground" : "bg-secondary/30 text-foreground font-medium") : ""}`}
                    >
                      {day}
                      {hasEvent && (
                        <span className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${isPast ? "bg-muted-foreground" : "bg-secondary"}`} />
                      )}
                    </span>
                  );
                })}
              </div>

              <div className="flex gap-4 mt-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
                  À venir
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
                  Passé
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Membre;
