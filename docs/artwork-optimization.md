# Artwork optimization

The 1.0.69 artwork variants use WebP quality 82 and compression method 6, at the original pixel dimensions. Transparent artwork retains a lossless alpha channel. The original files remain in `src/assets`; CSS references the `-optimized.webp` variants. Vite only includes referenced artwork, so the originals do not duplicate the egg payload.

Recreate a variant from its original with `cwebp -q 82 -m 6 original -o variant-optimized.webp` (the WebP command line tools are required). Switch a CSS reference only when the variant saves at least 5% of the original size.

The preview generator also refreshes the optimized thumbnails directly from its screenshots using browser WebP quality 0.82. The sports palette generator prefers optimized stadium files when available.

The release egg decreased from 13,168,347 to 9,683,135 bytes (26.5%). Its embedded style script decreased from 17,099,149 to 12,454,918 bytes.

The prior release egg and generated resources are preserved locally in `.dream-loop/artwork-optimization-before-1.0.69/`.
