#!/usr/bin/env sh
# Installs this checkout as the `dsh-searxng` plugin for DSH's web profile.
# It builds the package, creates ~/.dsh/node_modules/dsh-searxng, and installs
# the profile-level Cordis composition snippet without replacing other entries.

set -eu

REPOSITORY_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
DSH_HOME=${DSH_HOME:-"$HOME/.dsh"}
PROFILE_DIRECTORY="$DSH_HOME/profiles/web"
PROFILE_PATCH="$PROFILE_DIRECTORY/cordis.patch.yml"
PLUGIN_LINK="$DSH_HOME/node_modules/dsh-searxng"
SNIPPET="$REPOSITORY_ROOT/config/cordis.patch.profile-web.snippet.yml"

if ! command -v pnpm >/dev/null 2>&1; then
  printf '%s\n' 'pnpm is required to build dsh-searxng.' >&2
  exit 1
fi

if [ ! -f "$SNIPPET" ]; then
  printf 'Missing profile patch snippet: %s\n' "$SNIPPET" >&2
  exit 1
fi

(
  cd "$REPOSITORY_ROOT"
  pnpm install --frozen-lockfile
  pnpm run build
)

mkdir -p "$DSH_HOME/node_modules" "$PROFILE_DIRECTORY"
if [ -e "$PLUGIN_LINK" ] || [ -L "$PLUGIN_LINK" ]; then
  if [ -L "$PLUGIN_LINK" ] && [ "$(readlink "$PLUGIN_LINK")" = "$REPOSITORY_ROOT" ]; then
    printf 'Plugin link already installed: %s\n' "$PLUGIN_LINK"
  else
    printf 'Refusing to replace existing plugin path: %s\n' "$PLUGIN_LINK" >&2
    exit 1
  fi
else
  ln -s "$REPOSITORY_ROOT" "$PLUGIN_LINK"
  printf 'Installed plugin link: %s\n' "$PLUGIN_LINK"
fi

if [ ! -e "$PROFILE_PATCH" ]; then
  cp "$SNIPPET" "$PROFILE_PATCH"
  printf 'Created web-profile patch: %s\n' "$PROFILE_PATCH"
elif grep -Fq 'id: web-searxng' "$PROFILE_PATCH"; then
  printf 'Web-profile patch already selects the SearXNG provider: %s\n' "$PROFILE_PATCH"
elif [ "$(sed '/^[[:space:]]*#/d' "$PROFILE_PATCH" | tr -d '[:space:]')" = '[]' ]; then
  cp "$SNIPPET" "$PROFILE_PATCH"
  printf 'Replaced empty web-profile patch with SearXNG wiring: %s\n' "$PROFILE_PATCH"
else
  printf '\n%s\n' '# Added by dsh-searxng install-web-profile.sh' >> "$PROFILE_PATCH"
  cat "$SNIPPET" >> "$PROFILE_PATCH"
  printf 'Appended SearXNG wiring to web-profile patch: %s\n' "$PROFILE_PATCH"
fi

printf '%s\n' 'Restart dsh with --profile web for the composition change to take effect.'
