import LegalLayout from "./LegalLayout";

export default function Privacy() {
  return (
    <LegalLayout title="Politika privatnosti" updated="20.07.2026.">
      <h2>1. Uvod</h2>
      <p>
        Ova politika privatnosti opisuje kako aplikacija <strong>IDSS Fakture</strong> (u daljem
        tekstu „aplikacija") prikuplja, koristi i štiti lične podatke svojih korisnika. Voditelj
        obrade je <strong>IDSS d.o.o.</strong> Sarajevo (kontakt: <a href="mailto:direktor@idss.ba">direktor@idss.ba</a>).
      </p>

      <h2>2. Podaci koje prikupljamo</h2>
      <ul>
        <li><strong>Podaci o računu</strong>: email adresa, ime, uloga (superadmin/admin/viewer).</li>
        <li><strong>Poslovni podaci</strong>: klijenti, fakture, stavke, iznosi, PDV, statusi.</li>
        <li><strong>Tehnički podaci</strong>: IP adresa, tip pretraživača, vrijeme prijave, session token.</li>
        <li><strong>Sigurnosni podaci</strong>: MFA/TOTP secret (kriptovan), aktivne sesije, logovi grešaka.</li>
      </ul>

      <h2>3. Svrha obrade</h2>
      <ul>
        <li>Pružanje osnovne funkcionalnosti (izdavanje i praćenje faktura).</li>
        <li>Autentikacija, kontrola pristupa i zaštita od neovlaštenog pristupa.</li>
        <li>Ispunjavanje zakonskih obaveza (računovodstveni propisi BiH).</li>
        <li>Otklanjanje grešaka i unapređenje aplikacije.</li>
      </ul>

      <h2>4. Pravni osnov</h2>
      <p>
        Obradu vršimo na osnovu (a) izvršenja ugovora sa korisnikom, (b) zakonske obaveze
        čuvanja knjigovodstvene dokumentacije, i (c) legitimnog interesa za sigurnost sistema.
      </p>

      <h2>5. Čuvanje podataka</h2>
      <p>
        Politika zadržavanja podataka konfigurabilna je po organizaciji (kartica „Zadržavanje"
        u Postavkama). Izdane i plaćene fakture čuvaju se najmanje <strong>10 godina</strong>,
        u skladu s poreznim propisima. Logovi grešaka i audit zapisi zadržavaju se po zadanom
        90 dana.
      </p>

      <h2>6. Dijeljenje podataka</h2>
      <p>
        Podatke ne prodajemo trećim stranama. Podaci se pohranjuju kod našeg pružatelja
        backend infrastrukture (Lovable Cloud / Supabase) unutar EU regije. Pristup imaju
        isključivo ovlašteni korisnici organizacije.
      </p>

      <h2>7. Vaša prava</h2>
      <ul>
        <li>Pravo na pristup vlastitim podacima.</li>
        <li>Pravo na ispravku netačnih podataka.</li>
        <li>Pravo na brisanje (osim podataka koji se moraju čuvati po zakonu).</li>
        <li>Pravo na prigovor i pritužbu Agenciji za zaštitu ličnih podataka BiH.</li>
      </ul>
      <p>Zahtjeve slati na: <a href="mailto:direktor@idss.ba">direktor@idss.ba</a>.</p>

      <h2>8. Sigurnost</h2>
      <p>
        Primjenjujemo Row Level Security (RLS), enkripciju u tranzitu (TLS), MFA/TOTP,
        session management, i sigurnosne HTTP headere. Lozinke se pohranjuju hešovane
        (bcrypt).
      </p>

      <h2>9. Izmjene politike</h2>
      <p>
        Ovu politiku možemo periodično ažurirati. O bitnim izmjenama korisnici će biti
        obaviješteni putem aplikacije ili emaila.
      </p>
    </LegalLayout>
  );
}
