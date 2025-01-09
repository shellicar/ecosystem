#!/bin/bash
set -euo pipefail

readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly RESET='\033[0m'

readonly MARKER_BEGIN='<!-- BEGIN_ECOSYSTEM -->'
readonly MARKER_END='<!-- END_ECOSYSTEM -->'

update_single_readme() {
    local readme_path=$1
    local ecosystem_content
    local new_content
    local between_markers=false
    
    ecosystem_content=$(cat ecosystem.md)
    new_content=$(mktemp)
    
    while IFS= read -r line; do
        case "$line" in
            *"$MARKER_BEGIN"*)
                echo "$line" >> "$new_content"
                echo "" >> "$new_content"
                echo "$ecosystem_content" >> "$new_content"
                echo "" >> "$new_content"
                between_markers=true
                ;;
            *"$MARKER_END"*)
                echo "$line" >> "$new_content"
                between_markers=false
                ;;
            *)
                [[ $between_markers == false ]] && echo "$line" >> "$new_content"
                ;;
        esac
    done < "$readme_path"
    
    mv "$new_content" "$readme_path"
}

find -L .. -maxdepth 2 -name README.md -type f | while read -r readme_path; do
    echo -e "${GREEN}Processing${RESET} $readme_path..."

    if ! grep -q "$MARKER_BEGIN" "$readme_path"; then
        echo -e "${YELLOW}Skipping${RESET} $readme_path - no ecosystem markers found"
        continue
    fi

    current_section=$(sed -n "/$MARKER_BEGIN/,/$MARKER_END/p" "$readme_path")
    expected_section=$(printf "%s\n\n%s\n\n%s" "$MARKER_BEGIN" "$(cat ecosystem.md)" "$MARKER_END")
    
    if [ "$current_section" = "$expected_section" ]; then
        echo -e "${BLUE}No changes needed${RESET} for $readme_path"
        continue
    fi

    update_single_readme "$readme_path"
    echo -e "${GREEN}Updated${RESET} $readme_path successfully"
done
