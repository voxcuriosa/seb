/**
 * formsAuthList.js
 * Liste over tillatte URL-uttrykk for Microsoft Forms, Clarify og Feide SSO i SEB.
 * Kun nødvendige autentiserings-, ordbok- og skjemadomener (ikke hele office.com,
 * outlook eller åpne fylkeskommunale informasjonssider).
 */

const COUNTY_FEIDE_ROOTS = [
  'vfk.no',
  'telemarkfylke.no',
  'vestfoldfylke.no',
  'afk.no',
  'agderfk.no',
  'bfk.no',
  'ofk.no',
  'innlandetfylke.no',
  'rogfk.no',
  'vlfk.no',
  'mrfylke.no',
  'trondelagfylke.no',
  'nfk.no',
  'tffk.no',
  'ffk.no',
  'osloskolen.no',
  'ude.oslo.kommune.no'
];

const SSO_SUBDOMAIN_PREFIXES = ['adfs', 'sts', 'feide', 'idp', 'login', 'sso', 'auth', 'fs'];

const COUNTY_SSO_EXPRESSIONS = COUNTY_FEIDE_ROOTS.flatMap((root) =>
  SSO_SUBDOMAIN_PREFIXES.map((sub) => `${sub}.${root}/*`)
);

export const FORMS_AUTH_EXPRESSIONS = [
  'forms.office.com/*',
  '*.forms.office.com/*',
  'forms.microsoft.com/*',
  '*.forms.microsoft.com/*',
  'forms.cloud.microsoft/*',
  '*.forms.cloud.microsoft/*',
  'login.microsoftonline.com/*',
  '*.login.microsoftonline.com/*',
  'login.microsoft.com/*',
  '*.login.microsoft.com/*',
  'login.windows.net/*',
  '*.login.windows.net/*',
  'sts.windows.net/*',
  '*.sts.windows.net/*',
  'login.live.com/*',
  '*.login.live.com/*',
  '*.msauth.net/*',
  'aadcdn.msauth.net/*',
  '*.aadcdn.msauth.net/*',
  '*.msftauth.net/*',
  '*.msauthimages.net/*',
  '*.msftauthimages.net/*',
  '*.msidentity.com/*',
  '*.microsoftazuread-sso.com/*',
  'autologon.microsoftazuread-sso.com/*',
  'device.login.microsoftonline.com/*',
  'auth.gfx.ms/*',
  '*.auth.gfx.ms/*',
  '*.azureedge.net/*',
  '*.azurefd.net/*',
  '*.trafficmanager.net/*',
  'account.activedirectory.windowsazure.com/*',
  'feide.no/*',
  '*.feide.no/*',
  'idp.feide.no/*',
  'dataporten.no/*',
  '*.dataporten.no/*',
  'auth.dataporten.no/*',
  // Fylkeskommunale og kommunale Feide/ADFS-påloggingstjenere (kun SSO-subdomener, ikke www.<fylke>.no)
  ...COUNTY_SSO_EXPRESSIONS,
  'clarify.no/*',
  '*.clarify.no/*',
  'app.clarify.no/*',
  'verbix.com/*',
  '*.verbix.com/*'
];
