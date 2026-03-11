#!/bin/sh

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
. "$SCRIPT_DIR/../files/scripts/verify-version-functions.sh"

TESTS_RUN=0
TESTS_PASSED=0

test_assert_equals() {
  local expected="$1"
  local actual="$2"
  local test_name="$3"

  TESTS_RUN=$((TESTS_RUN + 1))

  if [ "$expected" = "$actual" ]; then
    echo "✓ $test_name"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo "✗ $test_name"
    echo "  Expected: '$expected'"
    echo "  Actual:   '$actual'"
  fi
}

test_get_base_version() {
  echo "Testing get_base_version..."

  test_assert_equals "1.2.3" "$(get_base_version "1.2.3")" "get_base_version with simple version"
  test_assert_equals "1.2.3" "$(get_base_version "1.2.3-preview.5")" "get_base_version with preview version"
  test_assert_equals "10.20.30" "$(get_base_version "10.20.30-alpha.1")" "get_base_version with alpha version"
  test_assert_equals "0.1.0" "$(get_base_version "0.1.0-beta.2")" "get_base_version with beta version"
}

test_get_changelog_versions() {
  echo "Testing get_changelog_versions..."

  local test_changelog="# Changelog

## [1.3.1] - 2025-10-24
### Added
- New feature

## [1.3.0] - 2025-10-20
### Fixed
- Bug fix

## [1.2.9] - 2025-10-15
### Changed
- Updated docs"

  if get_changelog_versions "$test_changelog" 2>/dev/null; then
    echo "✓ get_changelog_versions passes with correct semver order"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo "✗ get_changelog_versions should pass with correct semver order"
  fi
  TESTS_RUN=$((TESTS_RUN + 1))
}

test_get_changelog_versions_fails_when_not_semver_order() {
  local out_of_order_changelog="# Changelog

## [1.2.9] - 2025-10-24
### Added
- New feature

## [1.3.1] - 2025-10-20
### Fixed
- Bug fix

## [1.3.0] - 2025-10-15
### Changed
- Updated docs"

  if ! get_changelog_versions "$out_of_order_changelog" 2>/dev/null; then
    echo "✓ get_changelog_versions fails when versions are not in semver order"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo "✗ get_changelog_versions should fail when versions are not in semver order"
  fi
  TESTS_RUN=$((TESTS_RUN + 1))
}

test_check_version_header() {
  echo "Testing check_version_header..."

  local test_changelog="# Changelog

## [1.3.1] - 2025-10-24
### Added
- New feature

## [1.3.0] - 2025-10-20
### Fixed
- Bug fix"

  if check_version_header "$test_changelog" "1.3.1" "1.3.1-preview.5" 2>/dev/null; then
    echo "✓ check_version_header passes with valid version header"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo "✗ check_version_header should pass with valid version header"
  fi
  TESTS_RUN=$((TESTS_RUN + 1))

  if ! check_version_header "$test_changelog" "1.2.0" "1.2.0" 2>/dev/null; then
    echo "✓ check_version_header fails with missing version header"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo "✗ check_version_header should fail with missing version header"
  fi
  TESTS_RUN=$((TESTS_RUN + 1))
}

test_check_version_links() {
  echo "Testing check_version_links..."

  local test_changelog="# Changelog

## [1.3.1] - 2025-10-24
### Added
- New feature

## [1.3.0] - 2025-10-20
### Fixed
- Bug fix

[1.3.1]: https://github.com/shellicar/test-package/releases/tag/1.3.1
[1.3.0]: https://github.com/shellicar/test-package/releases/tag/1.3.0"

  if check_version_links "$test_changelog" "test-package" 2>/dev/null; then
    echo "✓ check_version_links passes with all links present"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo "✗ check_version_links should pass with all links present"
  fi
  TESTS_RUN=$((TESTS_RUN + 1))

  local bad_changelog="# Changelog

## [1.3.1] - 2025-10-24
### Added
- New feature

## [1.3.0] - 2025-10-20
### Fixed
- Bug fix

[1.3.1]: https://github.com/shellicar/test-package/releases/tag/1.3.1"

  if ! check_version_links "$bad_changelog" "test-package" 2>/dev/null; then
    echo "✓ check_version_links fails with missing link"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo "✗ check_version_links should fail with missing link"
  fi
  TESTS_RUN=$((TESTS_RUN + 1))

  local headers_more_than_links="# Changelog

## [2.0.0] - 2025-10-24
### Added
- New feature

## [1.0.0] - 2025-10-20
### Fixed
- Bug fix

[1.0.0]: https://github.com/shellicar/test-package/releases/tag/1.0.0"

  if ! check_version_links "$headers_more_than_links" "test-package" 2>/dev/null; then
    echo "✓ check_version_links fails when headers have more versions than links"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo "✗ check_version_links should fail when headers have more versions than links"
  fi
  TESTS_RUN=$((TESTS_RUN + 1))

  local links_more_than_headers="# Changelog

## [1.0.0] - 2025-10-24
### Added
- New feature

[2.0.0]: https://github.com/shellicar/test-package/releases/tag/2.0.0
[1.0.0]: https://github.com/shellicar/test-package/releases/tag/1.0.0"

  if ! check_version_links "$links_more_than_headers" "test-package" 2>/dev/null; then
    echo "✓ check_version_links fails when links have more versions than headers"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo "✗ check_version_links should fail when links have more versions than headers"
  fi
  TESTS_RUN=$((TESTS_RUN + 1))
}

test_package_version_must_be_first() {
  local out_of_order_changelog="# Changelog

## [1.2.9] - 2025-10-24
### Added
- New feature

## [1.3.1] - 2025-10-20
### Fixed
- Bug fix

## [1.3.0] - 2025-10-15
### Changed
- Updated docs"

  if ! check_version_header "$out_of_order_changelog" "1.3.1" "1.3.1" 2>/dev/null; then
    echo "✓ check_version_header fails when package version is not first changelog entry"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo "✗ check_version_header should fail when package version is not first changelog entry"
  fi
  TESTS_RUN=$((TESTS_RUN + 1))
}

test_version_links_must_be_in_order() {
  local out_of_order_links="# Changelog

## [1.3.1] - 2025-10-24
### Added
- New feature

## [1.3.0] - 2025-10-20
### Fixed
- Bug fix

## [1.2.9] - 2025-10-15
### Changed
- Updated docs

[1.2.9]: https://github.com/shellicar/test-package/releases/tag/1.2.9
[1.3.1]: https://github.com/shellicar/test-package/releases/tag/1.3.1
[1.3.0]: https://github.com/shellicar/test-package/releases/tag/1.3.0"

  if ! check_version_links "$out_of_order_links" "test-package" 2>/dev/null; then
    echo "✓ check_version_links fails when version links are out of order"
    TESTS_PASSED=$((TESTS_PASSED + 1))
  else
    echo "✗ check_version_links should fail when version links are out of order"
  fi
  TESTS_RUN=$((TESTS_RUN + 1))
}

test_version_ordering() {
  echo "Testing version ordering..."

  test_get_changelog_versions_fails_when_not_semver_order
  test_package_version_must_be_first
  test_version_links_must_be_in_order
}

echo "Running verify-version-functions.sh tests..."
echo

test_get_base_version
echo
test_get_changelog_versions
echo
test_check_version_header
echo
test_check_version_links
echo
test_version_ordering
echo

echo "Test Results:"
echo "============="
echo "Tests run: $TESTS_RUN"
echo "Tests passed: $TESTS_PASSED"
echo "Tests failed: $((TESTS_RUN - TESTS_PASSED))"

if [ $TESTS_PASSED -eq $TESTS_RUN ]; then
  echo "✓ All tests passed!"
  exit 0
else
  echo "✗ Some tests failed!"
  exit 1
fi
