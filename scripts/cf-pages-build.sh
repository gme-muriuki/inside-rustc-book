#!/usr/bin/env bash
# Cloudflare Pages build script.
#
# Downloads pre-built Linux x86_64 binaries for mdbook + the three plugins
# this book uses, then runs `mdbook build`. Much faster than `cargo install`
# (under a minute vs 17 minutes), so we stay well under Cloudflare's
# free-tier 20-minute build cap.
#
# In the Cloudflare Pages dashboard set:
#   Build command:           bash scripts/cf-pages-build.sh
#   Build output directory:  book
#   Root directory:          /  (leave default)
#
# Update the *_VERSION pins below when you bump a plugin.

set -euo pipefail

MDBOOK_VERSION="v0.5.3"
ADMONISH_VERSION="v1.20.0"
QUIZ_VERSION="v0.5.0"
PAGETOC_VERSION="v0.3.0"

BIN_DIR="$PWD/.cf-bin"
mkdir -p "$BIN_DIR"
export PATH="$BIN_DIR:$PATH"

download_extract() {
    local name="$1"
    local url="$2"
    local tmp
    tmp=$(mktemp -d)
    echo "::group::Downloading $name"
    curl -fsSL --retry 3 "$url" -o "$tmp/asset.tar.gz"
    tar -xzf "$tmp/asset.tar.gz" -C "$tmp"
    # Find the binary (file named exactly $name) anywhere in the extracted tree.
    local bin
    bin=$(find "$tmp" -type f -name "$name" | head -1)
    if [ -z "$bin" ]; then
        echo "ERROR: could not locate $name in extracted tarball"
        ls -R "$tmp"
        exit 1
    fi
    cp "$bin" "$BIN_DIR/$name"
    chmod +x "$BIN_DIR/$name"
    rm -rf "$tmp"
    echo "::endgroup::"
}

download_extract mdbook \
    "https://github.com/rust-lang/mdBook/releases/download/${MDBOOK_VERSION}/mdbook-${MDBOOK_VERSION}-x86_64-unknown-linux-gnu.tar.gz"

download_extract mdbook-admonish \
    "https://github.com/tommilligan/mdbook-admonish/releases/download/${ADMONISH_VERSION}/mdbook-admonish-${ADMONISH_VERSION}-x86_64-unknown-linux-gnu.tar.gz"

download_extract mdbook-quiz \
    "https://github.com/cognitive-engineering-lab/mdbook-quiz/releases/download/${QUIZ_VERSION}/mdbook-quiz_x86_64-unknown-linux-gnu_bare.tar.gz"

download_extract mdbook-pagetoc \
    "https://github.com/slowsage/mdbook-pagetoc/releases/download/${PAGETOC_VERSION}/mdbook-pagetoc-${PAGETOC_VERSION}-x86_64-unknown-linux-gnu.tar.gz"

echo "Installed binaries:"
"$BIN_DIR/mdbook" --version
"$BIN_DIR/mdbook-admonish" --version
"$BIN_DIR/mdbook-quiz" --version
# mdbook-pagetoc has no --version flag; just confirm the file is present
ls -lh "$BIN_DIR/mdbook-pagetoc"

echo "Running mdbook build"
mdbook build

echo "Build output:"
ls -la book/ | head -10
