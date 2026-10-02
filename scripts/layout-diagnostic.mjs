export const DIAGNOSTIC_FILE = 'screen-layout-test.html'

// Serve one independent document in dev and production. Never bundle React or
// duplicate the comparison CSS: the local fixture is the tested source of truth.
export function renderLayoutDiagnostic(template, release) {
  if (typeof release?.version !== 'string' || typeof release?.build !== 'string'
    || !/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i.test(release.version) || !/^(?:local|[a-f0-9]{7})$/.test(release.build)) {
    throw new Error('Invalid diagnostic release identity.')
  }
  const replaceOnce = (from, to) => {
    if (template.split(from).length !== 2) throw new Error('Diagnostic template marker missing or duplicated.')
    template = template.replace(from, to)
  }
  replaceOnce('name="lumen-diagnostic-version" content="local-unpublished"', `name="lumen-diagnostic-version" content="${release.version}"`)
  replaceOnce('name="lumen-diagnostic-build" content="local-unpublished"', `name="lumen-diagnostic-build" content="${release.build}"`)
  replaceOnce('class="return-link" href="../../"', 'class="return-link" href="./"')
  replaceOnce('This local page is not published to your phone yet.', 'Open from the existing Home Screen app; the mode above must say standalone.')
  return template
}
