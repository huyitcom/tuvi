#!/bin/bash
cat src/components/EditorSidebar.tsx | awk '
{
  if ($0 ~ /\{\/\* Gap Spacing Slider \*\/\}/) {
    print "            {/* Center Block Bg Color */}";
    print "            <div className=\"bg-stone-50 p-3.5 rounded-2xl border border-stone-200/80 space-y-2\">";
    print "              <span className=\"text-xs font-bold text-stone-800 uppercase tracking-wider block\">";
    print "                Màu Nền Khối Chữ (Nếu Có)";
    print "              </span>";
    print "              <div className=\"flex items-center gap-3\">";
    print "                <div className=\"relative w-8 h-8 rounded-full border border-stone-300 overflow-hidden shadow-xs cursor-pointer\">";
    print "                  <input";
    print "                    type=\"color\"";
    print "                    value={posterSettings.blockBgColor || '\''#8b988f'\''}";
    print "                    onChange={(e) => updateSettings('\''blockBgColor'\'', e.target.value)}";
    print "                    className=\"absolute inset-[-10px] w-12 h-12 cursor-pointer\"";
    print "                  />";
    print "                </div>";
    print "                <div className=\"flex flex-col\">";
    print "                  <span className=\"text-xs font-semibold text-stone-700\">Tùy chỉnh màu</span>";
    print "                  <span className=\"text-[10px] text-stone-500 uppercase\">{posterSettings.blockBgColor || '\''#8b988f'\''}</span>";
    print "                </div>";
    print "              </div>";
    print "            </div>";
    print "";
    print $0;
  } else {
    print $0;
  }
}' > src/components/EditorSidebar.tsx.new

mv src/components/EditorSidebar.tsx.new src/components/EditorSidebar.tsx
