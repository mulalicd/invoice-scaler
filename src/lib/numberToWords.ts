// Pretvara numerički iznos u tekst na bosanskom jeziku
// Npr. 1234.56 → "Hiljadu dvjesto trideset i četiri KM i 56/100"

const ones = ["", "jedan", "dva", "tri", "četiri", "pet", "šest", "sedam", "osam", "devet"];
const onesF = ["", "jedna", "dvije", "tri", "četiri", "pet", "šest", "sedam", "osam", "devet"];
const teens = ["deset", "jedanaest", "dvanaest", "trinaest", "četrnaest", "petnaest", "šesnaest", "sedamnaest", "osamnaest", "devetnaest"];
const tens = ["", "", "dvadeset", "trideset", "četrdeset", "pedeset", "šezdeset", "sedamdeset", "osamdeset", "devedeset"];
const hundreds = ["", "sto", "dvjesto", "tristo", "četristo", "petsto", "šeststo", "sedamsto", "osamsto", "devetsto"];

function under1000(n: number, feminine = false): string {
  if (n === 0) return "";
  const parts: string[] = [];
  const h = Math.floor(n / 100);
  const rem = n % 100;
  if (h) parts.push(hundreds[h]);
  if (rem >= 20) {
    const t = Math.floor(rem / 10);
    const o = rem % 10;
    parts.push(tens[t]);
    if (o) parts.push((feminine ? onesF : ones)[o]);
  } else if (rem >= 10) {
    parts.push(teens[rem - 10]);
  } else if (rem > 0) {
    parts.push((feminine ? onesF : ones)[rem]);
  }
  return parts.join(" ");
}

function thousandsForm(n: number): string {
  if (n === 1) return "hiljadu";
  const lastTwo = n % 100;
  const last = n % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "hiljada";
  if (last === 1) return "hiljada";
  if (last >= 2 && last <= 4) return "hiljade";
  return "hiljada";
}

function millionsForm(n: number): string {
  const last = n % 10;
  const lastTwo = n % 100;
  if (lastTwo >= 11 && lastTwo <= 14) return "miliona";
  if (last === 1) return "milion";
  if (last >= 2 && last <= 4) return "miliona";
  return "miliona";
}

export function numberToBosnianWords(amount: number): string {
  if (amount === 0) return "Nula KM i 00/100";
  const negative = amount < 0;
  const abs = Math.abs(amount);
  const whole = Math.floor(abs);
  const cents = Math.round((abs - whole) * 100);

  const millions = Math.floor(whole / 1_000_000);
  const thousands = Math.floor((whole % 1_000_000) / 1000);
  const rest = whole % 1000;

  const parts: string[] = [];
  if (millions > 0) {
    if (millions === 1) parts.push("jedan milion");
    else parts.push(`${under1000(millions)} ${millionsForm(millions)}`.trim());
  }
  if (thousands > 0) {
    if (thousands === 1) parts.push("hiljadu");
    else parts.push(`${under1000(thousands, true)} ${thousandsForm(thousands)}`.trim());
  }
  if (rest > 0) {
    parts.push(under1000(rest));
  }

  let words = parts.join(" ").trim();
  words = words.charAt(0).toUpperCase() + words.slice(1);
  const centsStr = cents.toString().padStart(2, "0");
  return `${negative ? "Minus " : ""}${words} KM i ${centsStr}/100`;
}
