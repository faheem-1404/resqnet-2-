import os
from ultralytics import YOLO
import argparse
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FloodSegmentationTrainer:
    def __init__(self, model_variant="yolov8n-seg.pt", project_name="runs/segment", run_name="train"):
        """
        Initialize the trainer with model variant and saving paths.
        """
        self.model_variant = model_variant
        self.project_name = project_name
        self.run_name = run_name
        self.model = YOLO(self.model_variant)
        logger.info(f"Initialized YOLOv8 model: {self.model_variant}")

    def train(self, data_yaml, epochs=30, imgsz=640, batch=4, device="cpu"):
        """
        Train the YOLOv8 segmentation model.
        """
        logger.info("Starting training...")
        results = self.model.train(
            data=data_yaml,
            epochs=epochs,
            imgsz=imgsz,
            batch=batch,
            device=device,
            project=self.project_name,
            name=self.run_name,
            exist_ok=True,
            save=True,
            plots=True,
            verbose=True
        )
        logger.info(f"Training completed. Results saved to {self.project_name}/{self.run_name}")
        return results

    def validate(self):
        """
        Validate the model and save results.
        """
        logger.info("Starting validation...")
        metrics = self.model.val()
        logger.info(f"Validation completed. mAP50-95: {metrics.seg.map:.4f}")
        return metrics

    def predict_examples(self, source, save_dir):
        """
        Run prediction on examples to show segmentation masks.
        """
        logger.info(f"Running predictions on {source}...")
        results = self.model.predict(
            source=source,
            save=True,
            save_txt=True,
            project=save_dir,
            name="predictions",
            exist_ok=True
        )
        logger.info(f"Predictions saved to {save_dir}/predictions")
        return results

def main():
    parser = argparse.ArgumentParser(description="Train YOLOv8 Flood Segmentation Model")
    parser.add_argument("--data", type=str, default="datasets/floods/data.yaml", help="Path to data.yaml")
    parser.add_argument("--epochs", type=int, default=30, help="Number of epochs")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size")
    parser.add_argument("--batch", type=int, default=4, help="Batch size")
    parser.add_argument("--device", type=str, default="cpu", help="Device (cpu, 0, 1, etc.)")
    
    args = parser.parse_args()

    # Initialize trainer
    trainer = FloodSegmentationTrainer()

    # 1. Train model
    trainer.train(
        data_yaml=args.data,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        device=args.device
    )

    # 2. Validate model (optional as train does it, but good to explicit)
    trainer.validate()

    # 3. Predict on a few examples from validation set to show masks
    val_images_path = "datasets/floods/val/images"
    if os.path.exists(val_images_path):
        # Take first 5 images as examples
        example_images = sorted([os.path.join(val_images_path, f) for f in os.listdir(val_images_path) if f.endswith('.jpg')])[:5]
        if example_images:
            trainer.predict_examples(source=example_images, save_dir="runs/segment")

if __name__ == "__main__":
    main()