import { languagePrefixes } from "@/constants/languages";

export type Lang = typeof languagePrefixes[number];

export type LanguageCodes = "en-US" | "de-DE" | "es-ES" | "fr-FR" | "it-IT";

export function getLangFromUrl(url: URL): Lang {
  const [, lang] = url.pathname.split("/");
  if (languagePrefixes.map((l) => l.split('-')[0]).includes(lang as Lang)) return lang as Lang;
  return "en"; // fallback
}

export function stripLangFromPath(url: URL) {
  const segments = url.pathname.split("/");
  segments.splice(1, 1); // remove the lang part
  return segments.join("/") || "/";
}

export function switchLang(url: URL, newLang: Lang) {
  const path = stripLangFromPath(url);
  return `/${newLang}${path}`;
}
