import io
from PIL import Image, ImageOps

MAX_DIMENSION = 1200  # Max width/height in pixels
QUALITY = 85          # Compression quality setting

def optimize_image_bytes(image_bytes: bytes, format_hint: str = "JPEG") -> bytes:
    """
    Downscales an image while maintaining aspect ratio and visual quality.
    Reduces file size for in-app performance optimization.
    """
    try:
        image = Image.open(io.BytesIO(image_bytes))
        
        # Auto-rotate based on EXIF orientation if available
        image = ImageOps.exif_transpose(image)
        
        # Convert RGBA/P mode to RGB if saving as JPEG
        if image.mode in ("RGBA", "P") and format_hint.upper() == "JPEG":
            image = image.convert("RGB")

        # Downscale while maintaining aspect ratio if larger than MAX_DIMENSION
        width, height = image.size
        if width > MAX_DIMENSION or height > MAX_DIMENSION:
            image.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)

        output_io = io.BytesIO()
        out_format = format_hint.upper() if format_hint.upper() in ["JPEG", "PNG", "WEBP"] else "JPEG"
        
        image.save(output_io, format=out_format, quality=QUALITY, optimize=True)
        return output_io.getvalue()
    except Exception as e:
        # If optimization fails (e.g. SVG or mock URL), return original bytes
        return image_bytes
