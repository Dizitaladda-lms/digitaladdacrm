const MAX_PROFILE_IMAGE_BYTES = 200 * 1024;

export const resizeProfileImage = (file) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, 256 / image.naturalWidth, 256 / image.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Your browser could not process this image."));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      const encode = (quality) =>
        new Promise((encodeResolve) => canvas.toBlob(encodeResolve, "image/jpeg", quality));

      const compress = async () => {
        for (const quality of [0.75, 0.65, 0.55, 0.45, 0.35]) {
          const blob = await encode(quality);
          if (blob && blob.size <= MAX_PROFILE_IMAGE_BYTES) {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(new Error("Could not read the compressed profile image."));
            reader.readAsDataURL(blob);
            return;
          }
        }
        reject(new Error("Profile image must be smaller than 200 KB after compression."));
      };

      compress().catch(reject);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Choose a valid PNG, JPEG, or WebP image."));
    };
    image.src = objectUrl;
  });
