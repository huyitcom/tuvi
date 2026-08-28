#!/bin/bash
cat src/components/TemplatePickerModal.tsx | awk '
{
  if ($0 ~ /if \(filter === '\''portrait'\''\) return tmpl.aspectRatio === '\''2:3'\'';/) {
    print "    if (filter === '\''portrait'\'') return tmpl.aspectRatio === '\''2:3'\'' || tmpl.aspectRatio === '\''22:30'\'';";
  } else if ($0 ~ /Khổ Đứng 60x90cm \(\{TEMPLATES.filter\(\(t\) => t.aspectRatio === '\''2:3'\''\).length\}\)/) {
    print "              Khổ Đứng ({TEMPLATES.filter((t) => t.aspectRatio === '\''2:3'\'' || t.aspectRatio === '\''22:30'\'').length})";
  } else if ($0 ~ /isLandscape \? '\''aspect-\[3\/2\]'\'' : '\''aspect-\[2\/3\]'\''/) {
    print "                      isLandscape ? '\''aspect-[3/2]'\'' : tmpl.aspectRatio === '\''22:30'\'' ? '\''aspect-[22/30]'\'' : '\''aspect-[2/3]'\''";
  } else if ($0 ~ /isLandscape \? '\''w-full h-full aspect-\[3\/2\]'\'' : '\''w-full h-full aspect-\[2\/3\]'\''/) {
    print "                        isLandscape ? '\''w-full h-full aspect-[3/2]'\'' : tmpl.aspectRatio === '\''22:30'\'' ? '\''w-full h-full aspect-[22/30]'\'' : '\''w-full h-full aspect-[2/3]'\''";
  } else if ($0 ~ /isLandscape \? '\''90x60 Ngang'\'' : '\''60x90 Đứng'\''/) {
    print "                      {isLandscape ? '\''90x60 Ngang'\'' : tmpl.aspectRatio === '\''22:30'\'' ? '\''22x30 Đứng'\'' : '\''60x90 Đứng'\''}";
  } else if ($0 ~ /isLandscape/) {
    # Check if it is the color block
    if ($0 ~ /\? '\''bg-amber-100 text-amber-800'\''/) {
      print $0;
      getline next_line; # This should be the else part
      print "                          : tmpl.aspectRatio === '\''22:30'\''";
      print "                          ? '\''bg-emerald-100 text-emerald-800'\''";
      print next_line;
    } else {
      print $0;
    }
  } else {
    print $0;
  }
}' > src/components/TemplatePickerModal.tsx.new

mv src/components/TemplatePickerModal.tsx.new src/components/TemplatePickerModal.tsx
