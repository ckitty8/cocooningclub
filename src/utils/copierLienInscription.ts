import { toast } from "sonner";
import { lienInscription } from "@/lib/preInscription";

/** Copie le lien d'inscription d'un atelier (à coller dans WhatsApp, un mail, un post…). */
export const copierLienInscription = async (atelierId: string) => {
  const url = lienInscription(atelierId);
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Lien d'inscription copié");
  } catch {
    window.prompt("Copiez le lien d'inscription :", url);
  }
};
