#!/usr/bin/env python3
"""Fix CarrierProfile.tsx - remove orphaned old review content and de-duplicate right column"""

filepath = "src/pages/CarrierProfile.tsx"

with open(filepath, encoding="utf-8") as f:
    content = f.read()

nl = "\r\n" if "\r\n" in content else "\n"
lines = content.split(nl)
print(f"Total lines: {len(lines)}, Newline: {'CRLF' if nl == chr(13)+chr(10) else 'LF'}")

# Find all occurrences of "Right Column - Stats"
right_col_indices = [i for i, line in enumerate(lines) if "Right Column - Stats" in line]
print(f"Right Column occurrences at indices: {right_col_indices} (lines: {[i+1 for i in right_col_indices]})")

# Find the Reviews card </Card> (the one just BEFORE the first Right Column occurrence)
first_right_col = right_col_indices[0]
reviews_card_end = None
for i in range(first_right_col - 1, -1, -1):
    if lines[i] == "          </Card>":
        reviews_card_end = i
        break

print(f"Reviews </Card> at index: {reviews_card_end} (line {reviews_card_end+1})")
print(f"Line at reviews_card_end: {repr(lines[reviews_card_end])}")
print(f"Line at reviews_card_end-1: {repr(lines[reviews_card_end-1][:60])}")

# If there are 2 Right Column occurrences (duplicated file), use the LAST one as start
# because the last one is the complete, correct copy (from the 0:699 slice + appended copy)
if len(right_col_indices) >= 2:
    good_right_col_start = right_col_indices[-1]  # last = the appended complete copy
    print(f"Using LAST Right Column occurrence at index {good_right_col_start} (line {good_right_col_start+1})")
else:
    good_right_col_start = right_col_indices[0]
    print(f"Using ONLY Right Column occurrence at index {good_right_col_start} (line {good_right_col_start+1})")

# Build the fixed file:
# 1. Lines 0..reviews_card_end (inclusive) = everything through </Card>
# 2. "        </div>" to close left column
# 3. blank line  
# 4. Lines good_right_col_start..end = complete right column section
kept_before = lines[:reviews_card_end + 1]
kept_after = lines[good_right_col_start:]

print(f"\nKeeping lines 1-{reviews_card_end+1} (before orphaned content)")
print(f"Keeping lines {good_right_col_start+1}-{len(lines)} (good right column)")
print(f"Removing {good_right_col_start - reviews_card_end - 1} orphaned lines")

new_lines = kept_before + ["        </div>", ""] + kept_after
new_content = nl.join(new_lines)

with open(filepath, "w", encoding="utf-8") as f:
    f.write(new_content)

print(f"\nDone! New file has {len(new_lines)} lines.")

# Show the boundary area for verification
print("\n--- Lines around the stitch point ---")
stitch = len(kept_before)
for i in range(max(0, stitch-3), min(len(new_lines), stitch+5)):
    print(f"  [{i+1}]: {repr(new_lines[i][:80])}")
