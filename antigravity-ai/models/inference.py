import cv2
from ultralytics import YOLO
import argparse
import time

def run_inference(model_path, source=0, imgsz=640, conf=0.25):
    """
    Run real-time inference on a video source or camera.
    """
    # Load the model
    model = YOLO(model_path)
    
    # Open the video source
    cap = cv2.VideoCapture(source)
    if not cap.isOpened():
        print(f"Error: Could not open video source {source}")
        return

    print("Press 'q' to quit.")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
            
        start_time = time.time()
        
        # Run inference
        results = model.predict(frame, imgsz=imgsz, conf=conf, verbose=False)
        
        # Process results
        annotated_frame = results[0].plot()
        
        # Calculate FPS
        fps = 1.0 / (time.time() - start_time)
        cv2.putText(annotated_frame, f"FPS: {fps:.2f}", (20, 40), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
        
        # Display the frame
        cv2.imshow("Flood Segmentation", annotated_frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break
            
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="YOLOv8 Flood Segmentation Inference")
    parser.add_argument("--model", type=str, default="runs/segment/train/weights/best.pt", help="Path to best.pt")
    parser.add_argument("--source", type=str, default="0", help="Video source (0 for webcam, or path to video)")
    parser.add_argument("--imgsz", type=int, default=640, help="Image size")
    parser.add_argument("--conf", type=float, default=0.25, help="Confidence threshold")
    
    args = parser.parse_args()
    
    # Convert source to int if it's a digit (for webcam)
    source = int(args.source) if args.source.isdigit() else args.source
    
    run_inference(args.model, source, args.imgsz, args.conf)
