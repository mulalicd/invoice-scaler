import LegalLayout from "./LegalLayout";

export default function Cookies() {
  return (
    <LegalLayout title="Obavijest o kolačićima" updated="20.07.2026.">
      <h2>1. Šta su kolačići</h2>
      <p>
        Kolačići (cookies) su male tekstualne datoteke koje se pohranjuju u vaš pretraživač
        prilikom posjete web aplikaciji. Uz kolačiće koristimo i lokalne mehanizme pohrane
        pretraživača (<code>localStorage</code>, <code>sessionStorage</code>).
      </p>

      <h2>2. Šta koristimo u ovoj aplikaciji</h2>
      <p>
        <strong>IDSS Fakture</strong> je interni poslovni alat i <strong>ne koristi kolačiće
        za marketing, analitiku niti profiliranje</strong>. Koristimo isključivo tehnički
        neophodne mehanizme:
      </p>
      <table>
        <thead>
          <tr>
            <th>Naziv</th>
            <th>Tip</th>
            <th>Svrha</th>
            <th>Trajanje</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>sb-*-auth-token</code></td>
            <td>localStorage</td>
            <td>Održavanje prijavljene sesije (autentikacija).</td>
            <td>Do odjave / isteka</td>
          </tr>
          <tr>
            <td><code>active_organization_id</code></td>
            <td>localStorage</td>
            <td>Zapamćena aktivna organizacija korisnika.</td>
            <td>Trajno dok se ne obriše</td>
          </tr>
          <tr>
            <td><code>theme</code></td>
            <td>localStorage</td>
            <td>Odabrana tema (svijetla/tamna).</td>
            <td>Trajno dok se ne obriše</td>
          </tr>
        </tbody>
      </table>

      <h2>3. Kolačići trećih strana</h2>
      <p>
        Ne postavljamo marketinške niti analitičke kolačiće trećih strana (Google Analytics,
        Meta Pixel i sl.).
      </p>

      <h2>4. Pravni osnov</h2>
      <p>
        Navedeni mehanizmi su <em>strogo neophodni</em> za funkcioniranje aplikacije
        (autentikacija, sigurnost, preference). Za njih se, prema ePrivacy pravilima i praksi
        Agencije za zaštitu ličnih podataka BiH, ne traži zasebna saglasnost korisnika.
      </p>

      <h2>5. Upravljanje kolačićima</h2>
      <p>
        Možete obrisati podatke u svom pretraživaču u bilo kojem trenutku (obično kroz
        <em>Postavke → Privatnost → Očisti podatke</em>). Napomena: brisanje autentikacijskih
        tokena će vas odjaviti iz aplikacije.
      </p>

      <h2>6. Kontakt</h2>
      <p>
        Za pitanja o kolačićima i privatnosti: <a href="mailto:direktor@idss.ba">direktor@idss.ba</a>.
        Vidi također <a href="/legal/privacy">Politiku privatnosti</a>.
      </p>
    </LegalLayout>
  );
}
