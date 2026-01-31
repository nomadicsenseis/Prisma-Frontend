
import os

file_path = 'script.js'

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

new_lines = []
in_conflict = False
buffer_head = []
buffer_feat = []
section = 'normal' # normal, head, feat

for line in lines:
    if line.startswith('<<<<<<<'):
        in_conflict = True
        section = 'head'
        buffer_head = []
        buffer_feat = []
        continue
    
    if line.startswith('======='):
        section = 'feat'
        continue
        
    if line.startswith('>>>>>>>'):
        # RESOLVE CONFLICT
        head_text = "".join(buffer_head)
        feat_text = "".join(buffer_feat)
        
        # Rule 1: 3D Geometry and Radius logic -> Prefer FEAT (User's good 3D logic)
        if 'prismaRadius' in feat_text and 'updatePrismaGeometry' in feat_text:
            new_lines.extend(buffer_feat)
            print("Resolution: Kept FEAT (Geometry)")
            
        # Rule 2: Rotation logic with translateZ -> Prefer FEAT (User's better 3D rotation)
        elif 'translateZ' in feat_text:
            new_lines.extend(buffer_feat)
            print("Resolution: Kept FEAT (Rotation 3D)")
            
        # Rule 3: Initialization and Desktop Logic -> Prefer HEAD (Our recent fixes)
        elif 'initDesktopMode' in head_text or 'window.addEventListener' in head_text:
            new_lines.extend(buffer_head)
            print("Resolution: Kept HEAD (Initialization)")
            
        # Rule 4: HTML Elements / markers -> Prefer HEAD (Usually safer if identical)
        elif 'fullScreenGlobe' in head_text:
            new_lines.extend(buffer_head)
            print("Resolution: Kept HEAD (Globe Init)")

        # Rule 5: Default -> Prefer HEAD (Current Desktop Fixes are priority)
        else:
            # Check if identical (ignore whitespace)
            if head_text.strip() == feat_text.strip():
                 new_lines.extend(buffer_head)
                 print("Resolution: Kept HEAD (Identical)")
            else:
                 new_lines.extend(buffer_head)
                 print("Resolution: Kept HEAD (Default fallback)")

        in_conflict = False
        section = 'normal'
        continue

    if in_conflict:
        if section == 'head':
            buffer_head.append(line)
        else:
            buffer_feat.append(line)
    else:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Conflicts resolved.")
