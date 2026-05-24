// import * as dayjs from "dayjs";

// import dayjs = require("dayjs")
export type Locale = 'en' | 'de' | 'es' | 'fr' | 'it'

type MonthNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

interface MonthName {
    full: string;
    short: string;
}

export const monthNamesEN: Record<MonthNumber, MonthName> = {
    1: { full: "January", short: "Jan" },
    2: { full: "February", short: "Feb" },
    3: { full: "March", short: "Mar" },
    4: { full: "April", short: "Apr" },
    5: { full: "May", short: "May" },
    6: { full: "June", short: "Jun" },
    7: { full: "July", short: "Jul" },
    8: { full: "August", short: "Aug" },
    9: { full: "September", short: "Sep" },
    10: { full: "October", short: "Oct" },
    11: { full: "November", short: "Nov" },
    12: { full: "December", short: "Dec" },
};

export const monthNamesDE: Record<MonthNumber, MonthName> = {
    1: { full: "Januar", short: "Jan" },
    2: { full: "Februar", short: "Feb" },
    3: { full: "März", short: "Mär" },
    4: { full: "April", short: "Apr" },
    5: { full: "Mai", short: "Mai" },
    6: { full: "Juni", short: "Jun" },
    7: { full: "Juli", short: "Jul" },
    8: { full: "August", short: "Aug" },
    9: { full: "September", short: "Sep" },
    10: { full: "Oktober", short: "Okt" },
    11: { full: "November", short: "Nov" },
    12: { full: "Dezember", short: "Dez" },
};

export const monthNamesES: Record<MonthNumber, MonthName> = {
    1: { full: "enero", short: "ene" },
    2: { full: "febrero", short: "feb" },
    3: { full: "marzo", short: "mar" },
    4: { full: "abril", short: "abr" },
    5: { full: "mayo", short: "may" },
    6: { full: "junio", short: "jun" },
    7: { full: "julio", short: "jul" },
    8: { full: "agosto", short: "ago" },
    9: { full: "septiembre", short: "sep" },
    10: { full: "octubre", short: "oct" },
    11: { full: "noviembre", short: "nov" },
    12: { full: "diciembre", short: "dic" },
};

export const monthNamesIT: Record<MonthNumber, MonthName> = {
    1: { full: "gennaio", short: "gen" },
    2: { full: "febbraio", short: "feb" },
    3: { full: "marzo", short: "mar" },
    4: { full: "aprile", short: "apr" },
    5: { full: "maggio", short: "mag" },
    6: { full: "giugno", short: "giu" },
    7: { full: "luglio", short: "lug" },
    8: { full: "agosto", short: "ago" },
    9: { full: "settembre", short: "set" },
    10: { full: "ottobre", short: "ott" },
    11: { full: "novembre", short: "nov" },
    12: { full: "dicembre", short: "dic" },
};

export const monthNamesFR: Record<MonthNumber, MonthName> = {
    1: { full: "janvier", short: "jan" },
    2: { full: "février", short: "fév" },
    3: { full: "mars", short: "mar" },
    4: { full: "avril", short: "avr" },
    5: { full: "mai", short: "mai" },
    6: { full: "juin", short: "jun" },
    7: { full: "juillet", short: "jul" },
    8: { full: "août", short: "aoû" },
    9: { full: "septembre", short: "sep" },
    10: { full: "octobre", short: "oct" },
    11: { full: "novembre", short: "nov" },
    12: { full: "décembre", short: "déc" },
};

const monthNames: Record<Locale, Record<MonthNumber, MonthName>> = {
    'en': monthNamesEN,
    'de': monthNamesDE,
    'es': monthNamesES,
    'it': monthNamesIT,
    'fr': monthNamesFR
}

export const getMonthName = (_monthNumber: MonthNumber, _locale: Locale) => monthNames[_locale][_monthNumber].full

export const getMonthShortName = (_monthNumber: MonthNumber, _locale: Locale) => monthNames[_locale][_monthNumber].short

export const eventDate = (_date: string, _locale: Locale = 'en'): { day: string, month: string, year: string } => {
    // const dj = dayjs(_date)
    const dj = new Date(_date);
    return {
        day: `${dj.getDate()}`,
        month: `${getMonthShortName(dj.getMonth() as MonthNumber, _locale)}`,
        year: `${dj.getFullYear()}`,
    }
}