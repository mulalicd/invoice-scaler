import LegalLayout from "./LegalLayout";

export default function Terms() {
  return (
    <LegalLayout title="Uvjeti korištenja" updated="20.07.2026.">
      <h2>1. Prihvatanje uvjeta</h2>
      <p>
        Pristupom i korištenjem aplikacije <strong>IDSS Fakture</strong> potvrđujete da ste
        pročitali, razumjeli i prihvatili ove uvjete korištenja u cijelosti.
      </p>

      <h2>2. Opis usluge</h2>
      <p>
        Aplikacija je interni SaaS alat za izdavanje, evidenciju i praćenje faktura te
        upravljanje klijentima. Namijenjen je isključivo ovlaštenim korisnicima
        organizacije IDSS d.o.o. i njenih podružnica (IMH i drugih).
      </p>

      <h2>3. Korisnički računi i pristup</h2>
      <ul>
        <li>Pristup je ograničen na whitelistirane email adrese. Nema javne registracije.</li>
        <li>Korisnik je odgovoran za povjerljivost svojih pristupnih podataka i MFA uređaja.</li>
        <li>Sve aktivnosti pod korisničkim računom smatraju se aktivnostima tog korisnika.</li>
        <li>Korisnik je dužan odmah prijaviti sumnju na neovlašteni pristup na <a href="mailto:direktor@idss.ba">direktor@idss.ba</a>.</li>
      </ul>

      <h2>4. Prihvatljivo korištenje</h2>
      <p>Zabranjeno je:</p>
      <ul>
        <li>Pokušavati zaobići sigurnosne mehanizme, RLS politike ili kontrolu pristupa.</li>
        <li>Reverzno inženjerstvo, automatizovano scraping-ovanje ili napadi na dostupnost.</li>
        <li>Unos lažnih ili obmanjujućih podataka u fakture i registre klijenata.</li>
        <li>Dijeljenje pristupnih kredencijala s trećim licima.</li>
      </ul>

      <h2>5. Uloge i ovlaštenja</h2>
      <ul>
        <li><strong>Superadmin</strong>: puni pristup, upravljanje korisnicima i organizacijama.</li>
        <li><strong>Admin</strong>: kreiranje/uređivanje faktura i klijenata unutar svoje organizacije.</li>
        <li><strong>Viewer</strong>: isključivo pregled i export – bez CRUD operacija.</li>
      </ul>

      <h2>6. Podaci korisnika</h2>
      <p>
        Vi ostajete vlasnik unesenih poslovnih podataka. Mi obrađujemo te podatke isključivo
        radi pružanja usluge, u skladu s <a href="/legal/privacy">Politikom privatnosti</a>.
      </p>

      <h2>7. Dostupnost i održavanje</h2>
      <p>
        Nastojimo osigurati visoku dostupnost, ali ne garantujemo neprekidnu uslugu. Zadržavamo
        pravo planiranog održavanja i privremenih prekida uz razuman prethodni notice.
      </p>

      <h2>8. Ograničenje odgovornosti</h2>
      <p>
        Aplikacija se pruža „kakva jeste". U mjeri dozvoljenoj zakonom, ne odgovaramo za
        indirektne, slučajne ili posljedične štete. Krajnja odgovornost za tačnost izdanih
        faktura i njihovu poreznu obradu je na korisniku i njegovoj organizaciji.
      </p>

      <h2>9. Prekid pristupa</h2>
      <p>
        Zadržavamo pravo suspendovati ili ukinuti pristup korisniku koji krši ove uvjete,
        ugrožava sigurnost sistema ili više nije zaposlenik ovlaštene organizacije.
      </p>

      <h2>10. Mjerodavno pravo</h2>
      <p>
        Na ove uvjete primjenjuje se pravo Bosne i Hercegovine. Za sporove je nadležan
        sud u Sarajevu.
      </p>

      <h2>11. Kontakt</h2>
      <p>Pitanja u vezi s ovim uvjetima: <a href="mailto:direktor@idss.ba">direktor@idss.ba</a>.</p>
    </LegalLayout>
  );
}
