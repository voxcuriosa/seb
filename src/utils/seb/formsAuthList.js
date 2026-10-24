/**
 * formsAuthList.js
 * Liste over tillatte URL-uttrykk for Microsoft Forms og Feide SSO i SEB.
 * Kun nødvendige autentiserings- og skjemadomener (ikke hele office.com eller outlook).
 */
export const FORMS_AUTH_EXPRESSIONS = [
  'forms.office.com/*',
  '*.forms.office.com/*',
  'forms.microsoft.com/*',
  '*.forms.microsoft.com/*',
  'login.microsoftonline.com/*',
  '*.login.microsoftonline.com/*',
  'login.live.com/*',
  '*.login.live.com/*',
  '*.msauth.net/*',
  'aadcdn.msauth.net/*',
  '*.aadcdn.msauth.net/*',
  '*.msftauth.net/*',
  '*.msauthimages.net/*',
  'auth.gfx.ms/*',
  '*.auth.gfx.ms/*',
  '*.azureedge.net/*',
  'account.activedirectory.windowsazure.com/*',
  '*.feide.no/*',
  'idp.feide.no/*'
];
