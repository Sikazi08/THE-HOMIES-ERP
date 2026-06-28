const UNITS = ["zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize"];

function numberToWordsFr(value) {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n < 0) return "zéro";
  if (n < 17) return UNITS[n];
  if (n < 20) return `dix-${UNITS[n - 10]}`;
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const rest = n % 10;
    const map = { 2: "vingt", 3: "trente", 4: "quarante", 5: "cinquante", 6: "soixante", 7: "soixante-dix", 8: "quatre-vingt", 9: "quatre-vingt-dix" };
    const base = map[tens] || "";
    if (rest === 0) return base;
    if (tens === 7) return `soixante-${UNITS[rest + 10]}`;
    if (tens === 8) return `${base}-${UNITS[rest]}`;
    if (tens === 9) return `${base}-${UNITS[rest + 10]}`;
    return `${base}-${UNITS[rest]}`;
  }
  if (n < 1000) {
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    const hundredsName = hundreds === 1 ? "cent" : `${UNITS[hundreds]} cents`;
    return rest === 0 ? hundredsName : `${hundredsName} ${numberToWordsFr(rest)}`;
  }
  if (n < 1000000) {
    const thousands = Math.floor(n / 1000);
    const rest = n % 1000;
    const thousandName = thousands === 1 ? "mille" : `${numberToWordsFr(thousands)} mille`;
    return rest === 0 ? thousandName : `${thousandName} ${numberToWordsFr(rest)}`;
  }
  return `${numberToWordsFr(Math.floor(n / 1000000))} million ${numberToWordsFr(n % 1000000)}`.trim();
}

function formatAmountWithWords(value) {
  const words = numberToWordsFr(Number(value) || 0);
  return `${words} FCFA`;
}

export { numberToWordsFr, formatAmountWithWords };
