import type { Oxfmtrc } from 'oxfmt';

const kamaalOxfmtStyle = {
  printWidth: 120,
  arrowParens: 'avoid',
  singleQuote: true,
} as const satisfies Oxfmtrc;

export default kamaalOxfmtStyle;
