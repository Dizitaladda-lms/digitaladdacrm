import axiosInstance from "../api/axiosInstance";

/**
 * Team Chat API Services
 */

export const getUserChatGroups = async () => {
  const response = await axiosInstance.get("/chat/groups");
  return response.data;
};

export const getChatUsers = async () => {
  const response = await axiosInstance.get("/chat/users");
  return response.data;
};

export const getOrCreateDirectChat = async (targetEmployeeId) => {
  const response = await axiosInstance.post("/chat/direct", { targetEmployeeId });
  return response.data;
};

export const getChatGroupDetails = async (groupId) => {
  const response = await axiosInstance.get(`/chat/groups/${groupId}`);
  return response.data;
};

export const createTeamChatGroup = async (payload) => {
  const response = await axiosInstance.post("/chat/groups", payload);
  return response.data;
};

export const getChatGroupMessages = async (groupId, params = {}) => {
  const response = await axiosInstance.get(`/chat/groups/${groupId}/messages`, { params });
  return response.data;
};

export const sendChatGroupMessage = async (groupId, payload) => {
  const response = await axiosInstance.post(`/chat/groups/${groupId}/messages`, payload);
  return response.data;
};

export const markChatGroupAsRead = async (groupId, messageId) => {
  const response = await axiosInstance.post(`/chat/groups/${groupId}/read`, { messageId });
  return response.data;
};

export const addMembersToChatGroup = async (groupId, employeeIds) => {
  const response = await axiosInstance.post(`/chat/groups/${groupId}/members`, { employeeIds });
  return response.data;
};

/**
 * Optimizes, resizes, and converts image file to base64 Data URL for fast chat sending
 */
export const compressAndPrepareImage = (file, maxWidth = 1600, maxHeight = 1600, quality = 0.85) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      return reject(new Error("Please select a valid image file (PNG, JPG, WEBP, GIF)."));
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to parse image data."));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect-ratio preserved dimensions
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to webp or jpeg
        const outputType = file.type === "image/png" ? "image/png" : "image/jpeg";
        const dataUrl = canvas.toDataURL(outputType, quality);

        // Calculate approx size in bytes
        const base64Length = dataUrl.length - (dataUrl.indexOf(",") + 1);
        const approxBytes = Math.floor(base64Length * 0.75);

        resolve({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name || `photo_${Date.now()}.${outputType === "image/png" ? "png" : "jpg"}`,
          type: outputType,
          size: approxBytes,
          url: dataUrl,
          width,
          height,
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

/**
 * Downloads a chat attachment directly to the user's phone or computer storage
 */
export const downloadChatAttachment = (attachment) => {
  try {
    if (!attachment || !attachment.url) {
      throw new Error("Invalid attachment data.");
    }

    const { url, name, type } = attachment;
    const fileName = name || `chat_image_${Date.now()}.${type?.split("/")[1] || "jpg"}`;

    if (url.startsWith("data:")) {
      // Robust Base64 -> Blob conversion for reliable mobile device downloads
      const parts = url.split(";base64,");
      const contentType = parts[0].split(":")[1] || type || "image/jpeg";
      const byteCharacters = atob(parts[1]);
      const byteArrays = [];

      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        byteArrays.push(new Uint8Array(byteNumbers));
      }

      const blob = new Blob(byteArrays, { type: contentType });
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.style.display = "none";
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      }, 2000);
    } else {
      // Normal remote URL
      const link = document.createElement("a");
      link.style.display = "none";
      link.href = url;
      link.download = fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
      }, 1000);
    }

    return true;
  } catch (err) {
    console.error("Failed to download chat attachment:", err);
    if (attachment?.url) {
      window.open(attachment.url, "_blank");
    }
    return false;
  }
};
