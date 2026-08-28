#!/bin/bash
cat src/data/constants.ts | awk '
BEGIN {
  count = 1;
  in_templates = 0;
}
/^export const TEMPLATES: TemplateDefinition\[\] = \[/ {
  in_templates = 1;
  print $0;
  next;
}
/^\];/ {
  if (in_templates) {
    in_templates = 0;
  }
}
{
  if (in_templates) {
    if ($0 ~ /name: '\''/) {
      sub(/name: '\''.*'\''/, "name: '\''Mẫu số " count "'\''", $0);
      count++;
    }
    
    # Update aspectRatio for the last 4 templates (id: grid-8-center-text, hero-trio-3, magazine-8, asymmetric-7)
    # Actually, we can just check if we are in one of those templates.
    if ($0 ~ /id: '\''(grid-8-center-text|hero-trio-3|magazine-8|asymmetric-7)'\''/) {
      current_target = 1;
    }
    
    if (current_target && $0 ~ /aspectRatio: '\''2:3'\''/) {
      sub(/aspectRatio: '\''2:3'\''/, "aspectRatio: '\''22:30'\''", $0);
      current_target = 0;
    }
  }
  print $0;
}' > src/data/constants.ts.new

mv src/data/constants.ts.new src/data/constants.ts
