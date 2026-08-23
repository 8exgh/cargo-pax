// Server component: the values are injected by the Docker build
// (GIT_COMMIT / BUILD_TIME build args set by the GitHub Action).
export function BuildInfoFooter() {
  const commit = process.env.GIT_COMMIT || 'dev';
  const buildTime = process.env.BUILD_TIME || '';

  const shortCommit = commit === 'unknown' || commit === 'dev' ? commit : commit.substring(0, 7);
  const builtAt = buildTime && buildTime !== 'unknown'
    ? buildTime.replace('T', ' ').replace('Z', ' UTC')
    : '';

  return (
    <footer className="py-3 text-center text-xs text-gray-400 space-y-1">
      <p>
        Created by{' '}
        <a
          href="https://8examples.com"
          target="_blank"
          rel="noopener"
          className="text-gray-500 hover:text-gray-700 hover:underline"
        >
          8examples.com
        </a>
        {' '}&middot; Hosted by{' '}
        <a
          href="https://swiftgrid.net"
          target="_blank"
          rel="noopener"
          className="text-gray-500 hover:text-gray-700 hover:underline"
        >
          SwiftGrid.net
        </a>
      </p>
      <p>
        build {shortCommit}
        {builtAt && <> &middot; {builtAt}</>}
      </p>
    </footer>
  );
}
