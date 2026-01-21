export function PasswordRequirementsHint() {
  return (
    <div className="text-sm text-muted-foreground space-y-1">
      <p className="font-medium">Hasło musi zawierać:</p>
      <ul className="list-disc list-inside space-y-0.5">
        <li>Co najmniej 8 znaków</li>
        <li>Co najmniej 1 małą literę (a-z)</li>
        <li>Co najmniej 1 wielką literę (A-Z)</li>
        <li>Co najmniej 1 cyfrę (0-9)</li>
        <li>Co najmniej 1 znak specjalny z zestawu: @$!%*?&#</li>
      </ul>
      <p className="text-xs mt-2">
        Dozwolone znaki: litery (a-z, A-Z), cyfry (0-9) oraz znaki specjalne:
        @$!%*?&#
      </p>
    </div>
  );
}
