import { moment } from "obsidian";

import en from "./locale/en";
import zhCN from "./locale/zh";

const localeMap: { [k: string]: Partial<typeof en> } = {
    en,
    "zh-cn": zhCN,
    "zh": zhCN,
};

const currentLocale = moment.locale().toLowerCase();

let locale = localeMap[currentLocale];
if (!locale) {
    const prefix = currentLocale.split('-')[0];
    locale = localeMap[prefix];
}

export function t(str: keyof typeof en): string {
  return (locale && locale[str]) || en[str];
}