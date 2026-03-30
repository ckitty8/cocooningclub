import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Mail, MailOpen, ChevronDown, ChevronUp, MessageSquare } from "lucide-react";

interface Message {
  id: string;
  data: Record<string, string>;
  lu: boolean;
  created_at: string;
}

const Messages = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState("tous");

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    setMessages((data as Message[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchMessages(); }, []);

  const toggleRead = async (msg: Message, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("contact_messages").update({ lu: !msg.lu }).eq("id", msg.id);
    fetchMessages();
  };

  const toggleExpand = async (msg: Message) => {
    if (expanded === msg.id) { setExpanded(null); return; }
    setExpanded(msg.id);
    if (!msg.lu) {
      await supabase.from("contact_messages").update({ lu: true }).eq("id", msg.id);
      fetchMessages();
    }
  };

  const filtered = messages.filter(m => {
    if (filter === "non_lus") return !m.lu;
    if (filter === "lus") return m.lu;
    return true;
  });

  const nonLus = messages.filter(m => !m.lu).length;

  const getName = (data: Record<string, string>) => {
    const prenom = data["Prénom"] ?? data["prenom"] ?? "";
    const nom = data["Nom"] ?? data["nom"] ?? "";
    return `${prenom} ${nom}`.trim() || "Anonyme";
  };

  const getEmail = (data: Record<string, string>) =>
    data["Email"] ?? data["email"] ?? "—";

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Messages de contact</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {nonLus > 0
              ? <span className="text-primary font-medium">{nonLus} message(s) non lu(s)</span>
              : "Tous les messages sont lus"}
          </p>
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)}
          className="border rounded-xl px-3 py-2 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="tous">Tous</option>
          <option value="non_lus">Non lus</option>
          <option value="lus">Lus</option>
        </select>
      </div>

      <div className="bg-card rounded-2xl border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Aucun message</p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map(msg => {
              const isOpen = expanded === msg.id;
              return (
                <div key={msg.id} className={!msg.lu ? "bg-primary/5" : ""}>
                  <div
                    className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-muted/20 transition-colors"
                    onClick={() => toggleExpand(msg)}
                  >
                    <button onClick={e => toggleRead(msg, e)} title={msg.lu ? "Marquer non lu" : "Marquer lu"}
                      className="text-muted-foreground hover:text-primary shrink-0 transition-colors">
                      {msg.lu
                        ? <MailOpen className="w-4 h-4" />
                        : <Mail className="w-4 h-4 text-primary" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${!msg.lu ? "font-semibold" : "font-medium"}`}>
                        {getName(msg.data)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{getEmail(msg.data)}</p>
                    </div>

                    <p className="text-xs text-muted-foreground shrink-0">
                      {new Date(msg.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                    </p>
                    {isOpen
                      ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </div>

                  {isOpen && (
                    <div className="px-6 pb-6 border-t bg-muted/10">
                      <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(msg.data).map(([key, value]) => {
                          const isMessage = key.toLowerCase() === "message";
                          return (
                            <div key={key} className={isMessage ? "sm:col-span-2" : ""}>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{key}</p>
                              <p className={`text-sm whitespace-pre-wrap ${isMessage ? "bg-card rounded-xl p-3 border" : ""}`}>
                                {value || "—"}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default Messages;
