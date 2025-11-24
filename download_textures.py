import os
import urllib.request

# Define URLs and filenames
textures = {
    "earth-blue-marble.jpg": "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
    "earth-night.jpg": "https://unpkg.com/three-globe/example/img/earth-night.jpg",
    "earth-clouds.png": "https://unpkg.com/three-globe/example/img/earth-clouds.png",
    "earth-topology.png": "https://unpkg.com/three-globe/example/img/earth-topology.png",
    "night-sky.png": "https://unpkg.com/three-globe/example/img/night-sky.png"
}

# Target directory
output_dir = "c:/Users/pw-drivera/Desktop/Prisma_Aletheia/Frontend/img"

# Create directory if it doesn't exist
if not os.path.exists(output_dir):
    os.makedirs(output_dir)
    print(f"Created directory: {output_dir}")

# Download files
for filename, url in textures.items():
    filepath = os.path.join(output_dir, filename)
    print(f"Downloading {filename}...")
    try:
        urllib.request.urlretrieve(url, filepath)
        print(f"Successfully downloaded {filename}")
    except Exception as e:
        print(f"Failed to download {filename}: {e}")
