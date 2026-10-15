import { useCallback, useRef, useState, type CSSProperties } from "react";

// Protection anti-robots légère pour les formulaires publics, sans service
// externe ni cookie :
//   - un champ « piège » invisible pour les humains, que les robots
//     remplissent en général automatiquement ;
//   - un délai minimal entre l'affichage du formulaire et l'envoi (un humain
//     met plus de 3 secondes à le remplir).
// Si l'un des deux signaux est levé, le formulaire fait comme si l'envoi
// avait réussi, sans rien envoyer : le robot ne sait pas qu'il a été repéré.
//
// La vraie barrière reste côté base (limite d'envois, validation) : un robot
// qui appelle directement l'API ne passe pas par ce code.

const MIN_FILL_MS = 3000;

// Masqué visuellement (technique « sr-only ») plutôt qu'avec display:none,
// que certains robots savent ignorer. aria-hidden + tabIndex=-1 le rendent
// inaccessible aux lecteurs d'écran et au clavier.
const hiddenStyle: CSSProperties = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

export const useAntiSpam = () => {
  const [trap, setTrap] = useState("");
  const shownAt = useRef(Date.now());

  /** À appeler à l'ouverture du formulaire (modale) pour relancer le chrono. */
  const reset = useCallback(() => {
    setTrap("");
    shownAt.current = Date.now();
  }, []);

  /** true si l'envoi ressemble à un robot : ne rien envoyer. */
  const isBot = useCallback(
    () => trap.trim() !== "" || Date.now() - shownAt.current < MIN_FILL_MS,
    [trap],
  );

  const honeypot = (
    <div style={hiddenStyle} aria-hidden="true">
      <label>
        Ne pas remplir ce champ
        <input
          type="text"
          name="site_web"
          tabIndex={-1}
          autoComplete="off"
          value={trap}
          onChange={e => setTrap(e.target.value)}
        />
      </label>
    </div>
  );

  return { honeypot, isBot, reset };
};
