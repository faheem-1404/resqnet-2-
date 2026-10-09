import cv2
import os
import numpy as np
from pathlib import Path
from tqdm import tqdm

def mask_to_polygon(mask):
    """Convert a binary mask to YOLO polygon format."""
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    polygons = []
    for contour in contours:
        if len(contour) < 3:
            continue
        polygon = contour.reshape(-1).tolist()
        # Normalize coordinates
        h, w = mask.shape
        normalized_polygon = [x / w if i % 2 == 0 else x / h for i, x in enumerate(polygon)]
        polygons.append(normalized_polygon)
    return polygons

def process_dataset(data_dir):
    """Process train/val sets to convert PNG masks to TXT polygons."""
    for split in ['train', 'val']:
        images_dir = Path(data_dir) / split / 'images'
        labels_dir = Path(data_dir) / split / 'labels'
        
        if not labels_dir.exists():
            print(f"Skipping {split} as labels directory does not exist.")
            continue
            
        print(f"Processing {split} set...")
        
        # Get all image files to match labels
        image_files = list(images_dir.glob('*.jpg'))
        
        for img_path in tqdm(image_files):
            # Derrive label path: image_1.jpg -> label_1.png
            img_num = img_path.stem.split('_')[-1]
            mask_path = labels_dir / f"label_{img_num}.png"
            txt_path = labels_dir / f"{img_path.stem}.txt"
            
            if not mask_path.exists():
                print(f"Warning: Mask not found for {img_path.name}")
                continue
                
            # Read mask
            mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
            if mask is None:
                print(f"Error reading mask: {mask_path}")
                continue
                
            # Threshold to ensure binary (handles both 0/255 and 0/1)
            binary_mask = (mask > 0).astype(np.uint8) * 255
            
            # Convert to polygons
            polygons = mask_to_polygon(binary_mask)
            
            # Save to YOLO format
            with open(txt_path, 'w') as f:
                for poly in polygons:
                    # Class 0 (flood)
                    poly_str = " ".join(map(str, poly))
                    f.write(f"0 {poly_str}\n")
        
        print(f"Finished processing {split} set.")

if __name__ == "__main__":
    dataset_path = "datasets/floods"
    process_dataset(dataset_path)
