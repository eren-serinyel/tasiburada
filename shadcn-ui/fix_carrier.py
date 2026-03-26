#!/usr/bin/env python3
"""Remove orphaned old review form/list from CarrierProfile.tsx"""

filepath = "src/pages/CarrierProfile.tsx"

with open(filepath, encoding="utf-8") as f:
    content = f.read()

# Detect newline style
nl = "\r\n" if "\r\n" in content else "\n"
lines = content.split(nl)

print(f"Total lines: {len(lines)}, Newline: {'CRLF' if nl == chr(13)+chr(10) else 'LF'}")

# Placeholder - will be set after finding right_col_line
new_card_line = None

# Find the "Right Column - Stats & Contact" comment
right_col_line = None
for i, line in enumerate(lines):
    if "Right Column - Stats" in line:
        right_col_line = i
        break

print(f"Right Column comment at line index: {right_col_line} (line {right_col_line+1})")

if right_col_line is None:
    print("ERROR: Could not find Right Column marker!")
    exit(1)

# Find the Reviews card </Card> that comes BEFORE the Right Column
new_card_line = None
for i in range(right_col_line - 1, -1, -1):
    if lines[i] == "          </Card>":
        new_card_line = i
        break

print(f"Reviews </Card> (before RightCol) at line index: {new_card_line} (line {new_card_line+1})")

# The orphaned content is from (new_card_line + 1) through (right_col_line - 1)
# We need to:
# 1. Keep lines 0 through new_card_line (inclusive) = the reviews card + everything above
# 2. Add "        </div>" to close the left column
# 3. Add a blank line
# 4. Keep from right_col_line onwards

print(f"Orphaned lines: {new_card_line+2} to {right_col_line} (1-based)")
print(f"Preview of orphaned start: {repr(lines[new_card_line+1][:80])}")
print(f"Preview of orphaned end (-1): {repr(lines[right_col_line-1][:80])}")
print(f"Preview of orphaned end (-2): {repr(lines[right_col_line-2][:80])}")

# Build new content
kept_before = lines[:new_card_line+1]  # everything through </Card>
left_col_close = "        </div>"       # 8 spaces - closes lg:col-span-2 div
kept_after = lines[right_col_line:]     # from {/* Right Column */} onwards

new_lines = kept_before + [left_col_close, ""] + kept_after
new_content = nl.join(new_lines)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(new_content)

print(f"Done! New file has {len(new_lines)} lines.")
