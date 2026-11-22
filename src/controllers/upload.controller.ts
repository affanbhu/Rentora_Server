import type { Request, Response } from "express";

export const uploadProfilePhoto = async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.IMGBB_API_KEY;

    if (!apiKey) {
      res.status(500).json({
        success: false,
        message: "Image upload is not configured on the server.",
      });
      return;
    }

    if (!req.file) {
      res.status(400).json({
        success: false,
        message: "Please select an image to upload.",
      });
      return;
    }

    const formData = new FormData();
    const image = new Blob([new Uint8Array(req.file.buffer)], {
      type: req.file.mimetype,
    });

    formData.append("image", image, req.file.originalname);

    const uploadResponse = await fetch(
      `https://api.imgbb.com/1/upload?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        body: formData,
      }
    );

    const result = (await uploadResponse.json()) as {
      success?: boolean;
      data?: {
        url?: string;
        display_url?: string;
      };
      error?: {
        message?: string;
      };
    };

    if (!uploadResponse.ok || !result.success || !result.data?.url) {
      res.status(502).json({
        success: false,
        message: result.error?.message || "Image hosting upload failed.",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Profile photo uploaded successfully.",
      imageUrl: result.data.url,
      displayUrl: result.data.display_url || result.data.url,
    });
  } catch (error) {
    console.error("Profile photo upload error:", error);
    res.status(500).json({
      success: false,
      message: "Unable to upload the profile photo. Please try again.",
    });
  }
};
