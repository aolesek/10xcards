import { useEffect, useState } from "react";

const TRIVIA_FACTS = [
  "Ludzie zapamiętują 80% tego, czego doświadczają osobiście, a tylko 20% tego, co przeczytają.",
  "Najlepsza metoda nauki to powtarzanie w regularnych odstępach czasowych.",
  "Mózg przechowuje informacje lepiej, gdy nauka jest rozłożona w czasie.",
  "Fiszki są skuteczniejsze niż wielokrotne czytanie tego samego materiału.",
  "Aktywne przypominanie wzmacnia pamięć bardziej niż bierne przeglądanie.",
  "Nauka tuż przed snem może pomóc w lepszym zapamiętaniu informacji.",
  "Przerwy podczas nauki poprawiają zdolność do zapamiętywania.",
  "Testowanie siebie jest jedną z najskuteczniejszych metod uczenia się.",
  "Nauka w różnych miejscach może pomóc w lepszym zapamiętaniu.",
  "Wyjaśnianie materiału innym osobom pomaga w jego lepszym zrozumieniu.",
  "Krótkie sesje nauki są bardziej efektywne niż długie maratony.",
  "Mózg potrzebuje około 8 godzin snu, aby skonsolidować nową wiedzę.",
  "Powtarzanie materiału po 24 godzinach zwiększa szanse na długotrwałe zapamiętanie.",
  "Muzyka może poprawić koncentrację podczas nauki, ale tylko instrumentalna.",
  "Dobre odżywianie i nawodnienie wpływają pozytywnie na zdolności poznawcze.",
  "Technika Pomodoro (25 min nauki + 5 min przerwy) może zwiększyć efektywność.",
  "Nauka nowego języka zwiększa elastyczność poznawczą mózgu.",
  "Pisanie odręczne pomaga w lepszym zapamiętaniu niż pisanie na klawiaturze.",
  "Wizualizacja informacji zwiększa szanse na ich zapamiętanie.",
  "Regularne ćwiczenia fizyczne poprawiają pamięć i funkcje poznawcze.",
];

interface AITriviaLoadingProps {
  intervalMs?: number; // How often to change the fact
}

export function AITriviaLoading({ intervalMs = 8000 }: AITriviaLoadingProps) {
  const [currentFactIndex, setCurrentFactIndex] = useState(() =>
    Math.floor(Math.random() * TRIVIA_FACTS.length)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFactIndex((prev) => (prev + 1) % TRIVIA_FACTS.length);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [intervalMs]);

  return (
    <div className="rounded-lg bg-muted/50 p-4 text-center">
      <p className="text-sm text-muted-foreground">
        💡 <span className="font-medium">Czy wiesz, że...</span>
      </p>
      <p className="mt-2 text-sm">{TRIVIA_FACTS[currentFactIndex]}</p>
    </div>
  );
}
